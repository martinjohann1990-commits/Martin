"""SolaX X1/X3-HAC wallbox via local Modbus TCP.

Register map (HAC = "GEN2"), taken from the community-maintained
homeassistant-solax-modbus project (plugin_solax_ev_charger.py):

  Input  0x000B  Total charge power        S16, W
  Input  0x001D  EVSE state (run mode)     0=Available 1=Preparing 2=Charging ...
  Hold   0x060D  Charger use mode          0=Stop 1=Fast 2=ECO 3=Green
  Hold   0x0627  Control command           3=Stop charging 4=Start charging
  Hold   0x0628  Charge current            0.01 A  (600 = 6 A)
  Hold   0xA105  Phase switching           1=Single-phase 2=Three-phase 3=Auto (EMS block)
  Input  0xA02A  Charging phase            0=Idle 1=Single-phase 2=Three-phase

The phase registers belong to the HAC "EMS" register block, which needs a
recent firmware. If the box answers with a Modbus exception, phase switching
is reported as unsupported and the charger keeps its own phase setting.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from .modbus_tcp import ModbusError, ModbusTcpClient, to_signed16

log = logging.getLogger(__name__)

REG_IN_CHARGE_POWER = 0x000B
REG_IN_RUN_MODE = 0x001D
REG_HOLD_USE_MODE = 0x060D
REG_HOLD_CONTROL = 0x0627
REG_HOLD_CHARGE_CURRENT = 0x0628
REG_HOLD_PHASE_SWITCHING = 0xA105
REG_IN_CHARGING_PHASE = 0xA02A

PHASE_SWITCH_VALUE = {1: 1, 3: 2}

USE_MODE_FAST = 1
CMD_STOP = 3
CMD_START = 4

RUN_MODES = {
    0: "Available", 1: "Preparing", 2: "Charging", 3: "Finishing", 4: "Faulted",
    5: "Unavailable", 6: "Reserved", 7: "Suspended EV", 8: "Suspended EVSE",
    9: "Update", 10: "Card Activation", 11: "Start Delay", 12: "Charge Paused",
    13: "Stopping", 14: "Occupied", 15: "Waiting for Response", 16: "Discharging",
    17: "Phase Switching",
}
# states in which a car is plugged in
CAR_CONNECTED_STATES = {1, 2, 3, 7, 8, 11, 12, 13, 14}


@dataclass
class WallboxState:
    power_w: float
    run_mode: int
    current_setpoint_a: float | None = None
    phase_setting: int | None = None    # phases requested at the box (1/3), None = unknown
    charging_phases: int | None = None  # phases actually used right now (0 = idle)

    @property
    def run_mode_name(self) -> str:
        return RUN_MODES.get(self.run_mode, f"Unknown({self.run_mode})")

    @property
    def car_connected(self) -> bool:
        return self.run_mode in CAR_CONNECTED_STATES

    @property
    def charging(self) -> bool:
        return self.run_mode == 2


class HacWallbox:
    def __init__(self, host: str, port: int = 502, unit_id: int = 1):
        self.client = ModbusTcpClient(host, port, unit_id)
        self.phase_switching_supported: bool | None = None  # None = not probed yet

    def read_state(self) -> WallboxState:
        power = to_signed16(self.client.read_input_registers(REG_IN_CHARGE_POWER)[0])
        run_mode = self.client.read_input_registers(REG_IN_RUN_MODE)[0]
        current = self.client.read_holding_registers(REG_HOLD_CHARGE_CURRENT)[0] / 100.0
        st = WallboxState(power_w=float(power), run_mode=run_mode, current_setpoint_a=current)
        if self.phase_switching_supported is not False:
            try:
                setting = self.client.read_holding_registers(REG_HOLD_PHASE_SWITCHING)[0]
                active = self.client.read_input_registers(REG_IN_CHARGING_PHASE)[0]
                st.phase_setting = {1: 1, 2: 3}.get(setting)
                st.charging_phases = {0: 0, 1: 1, 2: 3}.get(active)
                self.phase_switching_supported = True
            except ModbusError as exc:  # box answered "illegal address" etc.
                log.warning("Wallbox does not support phase switching registers (%s); "
                            "check firmware or set the phase in the SolaX app", exc)
                self.phase_switching_supported = False
            except OSError as exc:      # transient network problem: try again next cycle
                log.debug("Could not read phase registers: %s", exc)
        return st

    def set_phases(self, phases: int) -> None:
        if self.phase_switching_supported is False:
            raise ModbusError("phase switching not supported by this wallbox/firmware")
        log.info("Switching wallbox to %d-phase charging", phases)
        self.client.write_register(REG_HOLD_PHASE_SWITCHING, PHASE_SWITCH_VALUE[phases])

    def ensure_fast_mode(self) -> None:
        """'Fast' mode makes the box follow the charge current register 1:1."""
        if self.client.read_holding_registers(REG_HOLD_USE_MODE)[0] != USE_MODE_FAST:
            log.info("Setting wallbox use mode to 'Fast' (controlled externally)")
            self.client.write_register(REG_HOLD_USE_MODE, USE_MODE_FAST)

    def set_current(self, amps: float) -> None:
        self.client.write_register(REG_HOLD_CHARGE_CURRENT, int(round(amps * 100)))

    def start(self) -> None:
        self.client.write_register(REG_HOLD_CONTROL, CMD_START)

    def stop(self) -> None:
        self.client.write_register(REG_HOLD_CONTROL, CMD_STOP)

    def close(self) -> None:
        self.client.close()


class DryRunWallbox:
    """Logs commands instead of sending them. Simulates a plugged-in car."""

    def __init__(self, phases: int = 3, voltage: float = 230.0):
        self.phases, self.voltage = phases, voltage
        self.amps, self.on = 6.0, False
        self.phase_switching_supported = True

    def read_state(self) -> WallboxState:
        power = self.amps * self.phases * self.voltage if self.on else 0.0
        return WallboxState(power_w=power, run_mode=2 if self.on else 1, current_setpoint_a=self.amps,
                            phase_setting=self.phases, charging_phases=self.phases if self.on else 0)

    def set_phases(self, phases: int) -> None:
        log.info("[dry-run] switch to %d-phase", phases)
        self.phases = phases

    def ensure_fast_mode(self) -> None:
        log.info("[dry-run] ensure use mode = Fast")

    def set_current(self, amps: float) -> None:
        log.info("[dry-run] set charge current %.0f A", amps)
        self.amps = amps

    def start(self) -> None:
        log.info("[dry-run] START charging")
        self.on = True

    def stop(self) -> None:
        log.info("[dry-run] STOP charging")
        self.on = False

    def close(self) -> None:
        pass
