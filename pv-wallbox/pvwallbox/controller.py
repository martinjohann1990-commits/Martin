"""PV-surplus control logic (pure, no I/O -> fully unit-testable)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

MODES = ("pv", "minpv", "fast", "off")


@dataclass
class ControllerConfig:
    phases: int = 3
    voltage: float = 230.0
    min_current_a: float = 6.0
    max_current_a: float = 16.0
    # "feedin": use grid export from the cloud (needs meter/CT at the inverter)
    # "pv_minus_base": PV power minus an assumed constant house load
    surplus_source: str = "feedin"
    base_load_w: float = 400.0
    reserve_w: float = 100.0            # always leave this much for the house
    allow_grid_w: float = 300.0         # tolerated grid draw while charging before stopping
    ev_before_battery: bool = False     # True: battery charge power counts as surplus
    start_delay_s: float = 300.0        # surplus must be stable this long before start
    stop_delay_s: float = 600.0         # deficit must last this long before stop
    min_on_s: float = 900.0             # protect contactor / car: min charging time
    min_off_s: float = 300.0            # min pause between charge sessions
    smoothing: float = 0.5              # EMA weight of a new cloud sample (1 = no smoothing)
    stale_after_s: float = 900.0        # cloud data older than this counts as missing
    stale_action: str = "stop"          # "stop" or "min" when cloud data is stale

    @property
    def watts_per_amp(self) -> float:
        return self.phases * self.voltage

    @property
    def min_power_w(self) -> float:
        return self.min_current_a * self.watts_per_amp


@dataclass
class Decision:
    charge: bool
    current_a: float
    reason: str
    surplus_w: float | None = None


@dataclass
class ControllerState:
    charging: bool = False
    last_switch: float = -math.inf
    above_since: float | None = None
    below_since: float | None = None
    surplus_w: float | None = None      # smoothed
    last_sample_key: str | None = None
    last_sample_at: float | None = None  # local monotonic time when sample was new


@dataclass
class Controller:
    cfg: ControllerConfig
    mode: str = "pv"
    state: ControllerState = field(default_factory=ControllerState)

    # -- surplus ---------------------------------------------------------------
    def raw_surplus(self, pv_w: float, feedin_w: float | None, battery_w: float, ev_power_w: float) -> float:
        c = self.cfg
        if c.surplus_source == "feedin" and feedin_w is not None:
            # export + what the car already takes = what would be exported without the car
            surplus = feedin_w + ev_power_w
            if battery_w > 0 and c.ev_before_battery:
                surplus += battery_w          # redirect battery charging to the car
            elif battery_w < 0:
                surplus += battery_w          # never drain the home battery into the car
        else:
            surplus = pv_w - c.base_load_w
        return surplus - c.reserve_w

    def feed_sample(self, now: float, sample_key: str, pv_w: float, feedin_w: float | None,
                    battery_w: float, ev_power_w: float) -> None:
        """Feed one cloud sample; duplicates (same upload time) are ignored."""
        if sample_key and sample_key == self.state.last_sample_key:
            return
        raw = self.raw_surplus(pv_w, feedin_w, battery_w, ev_power_w)
        s = self.state
        a = self.cfg.smoothing
        s.surplus_w = raw if s.surplus_w is None else a * raw + (1 - a) * s.surplus_w
        s.last_sample_key = sample_key
        s.last_sample_at = now

    def data_is_fresh(self, now: float) -> bool:
        at = self.state.last_sample_at
        return at is not None and now - at <= self.cfg.stale_after_s

    # -- decision --------------------------------------------------------------
    def _amps_for(self, watts: float) -> float:
        c = self.cfg
        return max(c.min_current_a, min(c.max_current_a, math.floor(watts / c.watts_per_amp)))

    def _switch(self, now: float, on: bool) -> None:
        if on != self.state.charging:
            self.state.charging = on
            self.state.last_switch = now
        self.state.above_since = self.state.below_since = None

    def decide(self, now: float, car_connected: bool) -> Decision:
        c, s = self.cfg, self.state
        surplus = s.surplus_w

        if not car_connected:
            self._switch(now, False)
            return Decision(False, c.min_current_a, "no car connected", surplus)
        if self.mode == "off":
            self._switch(now, False)
            return Decision(False, c.min_current_a, "mode off", surplus)
        if self.mode == "fast":
            self._switch(now, True)
            return Decision(True, c.max_current_a, "mode fast", surplus)

        fresh = self.data_is_fresh(now) and surplus is not None
        if self.mode == "minpv":
            self._switch(now, True)
            amps = self._amps_for(surplus) if fresh else c.min_current_a
            return Decision(True, amps, "min+pv" if fresh else "min+pv (no fresh PV data)", surplus)

        # ---- mode "pv" -------------------------------------------------------
        if not fresh:
            on = c.stale_action == "min"
            self._switch(now, on)
            return Decision(on, c.min_current_a, f"PV data stale -> {c.stale_action}", surplus)

        since_switch = now - s.last_switch
        if not s.charging:
            if surplus >= c.min_power_w:
                s.above_since = s.above_since if s.above_since is not None else now
                waited = now - s.above_since
                if waited >= c.start_delay_s and since_switch >= c.min_off_s:
                    self._switch(now, True)
                    return Decision(True, self._amps_for(surplus), "surplus sufficient -> start", surplus)
                return Decision(False, c.min_current_a, f"surplus ok, waiting ({waited:.0f}s)", surplus)
            s.above_since = None
            return Decision(False, c.min_current_a, "surplus too low", surplus)

        # charging
        if surplus < c.min_power_w - c.allow_grid_w:
            s.below_since = s.below_since if s.below_since is not None else now
            waited = now - s.below_since
            if waited >= c.stop_delay_s and since_switch >= c.min_on_s:
                self._switch(now, False)
                return Decision(False, c.min_current_a, "surplus gone -> stop", surplus)
            return Decision(True, c.min_current_a, f"deficit, holding min ({waited:.0f}s)", surplus)
        s.below_since = None
        return Decision(True, self._amps_for(surplus), "following PV surplus", surplus)
