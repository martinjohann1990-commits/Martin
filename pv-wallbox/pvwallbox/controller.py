"""PV-surplus control logic (pure, no I/O -> fully unit-testable)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

MODES = ("pv", "minpv", "fast", "off")
PHASE_MODES = ("1", "3", "auto")


@dataclass
class ControllerConfig:
    phases: int = 3                     # used when phase_mode is not set
    # "1" = always single-phase, "3" = always three-phase,
    # "auto" = switch 1 <-> 3 phases depending on PV surplus
    phase_mode: str | None = None
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
    phase_up_margin_w: float = 200.0    # auto: extra surplus above 3-phase minimum before switching up
    phase_up_delay_s: float = 600.0     # auto: surplus must allow 3 phases this long
    phase_down_delay_s: float = 600.0   # auto: deficit at 3 phases this long -> back to 1 phase
    phase_switch_min_s: float = 900.0   # auto: min time between two phase switches
    smoothing: float = 0.5              # EMA weight of a new cloud sample (1 = no smoothing)
    stale_after_s: float = 900.0        # cloud data older than this counts as missing
    stale_action: str = "stop"          # "stop" or "min" when cloud data is stale

    def __post_init__(self):
        self.phase_mode = str(self.phase_mode if self.phase_mode is not None else self.phases).lower()
        if self.phase_mode not in PHASE_MODES:
            raise ValueError(f"phase_mode must be one of {PHASE_MODES}, got {self.phase_mode!r}")

    def min_power_w(self, phases: int) -> float:
        return self.min_current_a * phases * self.voltage


@dataclass
class Decision:
    charge: bool
    current_a: float
    reason: str
    surplus_w: float | None = None
    phases: int = 3


@dataclass
class ControllerState:
    charging: bool = False
    phases: int = 3                      # phases currently in use / requested
    last_switch: float = -math.inf
    last_phase_switch: float = -math.inf
    timers: dict = field(default_factory=dict)
    surplus_w: float | None = None       # smoothed
    last_sample_key: str | None = None
    last_sample_at: float | None = None  # local monotonic time when sample was new


@dataclass
class Controller:
    cfg: ControllerConfig
    mode: str = "pv"
    phase_mode: str | None = None        # runtime override of cfg.phase_mode
    state: ControllerState = field(default_factory=ControllerState)

    def __post_init__(self):
        if self.phase_mode is None:
            self.phase_mode = self.cfg.phase_mode
        if self.phase_mode in ("1", "3"):
            self.state.phases = int(self.phase_mode)

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

    # -- helpers ---------------------------------------------------------------
    def _timer(self, name: str, active: bool, now: float) -> float | None:
        """Seconds a condition has been continuously true (None if it is false)."""
        t = self.state.timers
        if not active:
            t.pop(name, None)
            return None
        return now - t.setdefault(name, now)

    def _amps_for(self, watts: float, phases: int) -> float:
        c = self.cfg
        return max(c.min_current_a, min(c.max_current_a, math.floor(watts / (phases * c.voltage))))

    def _switch(self, now: float, on: bool) -> None:
        if on != self.state.charging:
            self.state.charging = on
            self.state.last_switch = now
        self.state.timers.clear()

    def _set_phases(self, now: float, phases: int) -> None:
        if phases != self.state.phases:
            self.state.phases = phases
            self.state.last_phase_switch = now
        for k in ("phase_up", "phase_down"):
            self.state.timers.pop(k, None)

    def _d(self, charge: bool, amps: float, reason: str) -> Decision:
        return Decision(charge, amps, reason, self.state.surplus_w, self.state.phases)

    # -- decision --------------------------------------------------------------
    def decide(self, now: float, car_connected: bool) -> Decision:
        c, s = self.cfg, self.state
        surplus = s.surplus_w
        auto = self.phase_mode == "auto"
        if not auto:
            self._set_phases(now, int(self.phase_mode))

        if not car_connected:
            self._switch(now, False)
            return self._d(False, c.min_current_a, "no car connected")
        if self.mode == "off":
            self._switch(now, False)
            return self._d(False, c.min_current_a, "mode off")
        if self.mode == "fast":
            if auto:
                self._set_phases(now, 3)
            self._switch(now, True)
            return self._d(True, c.max_current_a, "mode fast")

        fresh = self.data_is_fresh(now) and surplus is not None
        if self.mode == "minpv":
            self._switch(now, True)
            if not fresh:
                return self._d(True, c.min_current_a, "min+pv (no fresh PV data)")
            if auto:
                self._auto_phases(now, surplus)
            return self._d(True, self._amps_for(surplus, s.phases), "min+pv")

        # ---- mode "pv" -------------------------------------------------------
        if not fresh:
            on = c.stale_action == "min"
            self._switch(now, on)
            return self._d(on, c.min_current_a, f"PV data stale -> {c.stale_action}")

        if not s.charging:
            start_phases = (3 if surplus >= c.min_power_w(3) else 1) if auto else s.phases
            waited = self._timer("start", surplus >= c.min_power_w(start_phases), now)
            if waited is None:
                return self._d(False, c.min_current_a, "surplus too low")
            if waited >= c.start_delay_s and now - s.last_switch >= c.min_off_s:
                s.phases = start_phases  # choosing the start phase is not a "switch"
                self._switch(now, True)
                return self._d(True, self._amps_for(surplus, s.phases), "surplus sufficient -> start")
            return self._d(False, c.min_current_a, f"surplus ok, waiting ({waited:.0f}s)")

        # charging
        if auto and self._auto_phases(now, surplus):
            return self._d(True, self._amps_for(surplus, s.phases), f"phase switch -> {s.phases}-phase")

        waited = self._timer("stop", surplus < c.min_power_w(s.phases) - c.allow_grid_w, now)
        if waited is None:
            return self._d(True, self._amps_for(surplus, s.phases), "following PV surplus")
        # in auto mode a 3-phase deficit is handled by switching down to 1 phase first
        can_stop = not (auto and s.phases == 3)
        if can_stop and waited >= c.stop_delay_s and now - s.last_switch >= c.min_on_s:
            self._switch(now, False)
            return self._d(False, c.min_current_a, "surplus gone -> stop")
        return self._d(True, c.min_current_a, f"deficit, holding min ({waited:.0f}s)")

    def _auto_phases(self, now: float, surplus: float) -> bool:
        """Switch between 1 and 3 phases with hysteresis. Returns True if switched."""
        c, s = self.cfg, self.state
        may_switch = now - s.last_phase_switch >= c.phase_switch_min_s
        if s.phases == 1:
            waited = self._timer("phase_up", surplus >= c.min_power_w(3) + c.phase_up_margin_w, now)
            if waited is not None and waited >= c.phase_up_delay_s and may_switch:
                self._set_phases(now, 3)
                return True
        else:
            waited = self._timer("phase_down", surplus < c.min_power_w(3) - c.allow_grid_w, now)
            if waited is not None and waited >= c.phase_down_delay_s and may_switch:
                self._set_phases(now, 1)
                self.state.timers.pop("stop", None)
                return True
        return False
