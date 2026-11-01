"""Service entry point: poll SolaX Cloud + wallbox, decide, apply, serve status page."""

from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import threading
import time
import tomllib
from collections import deque
from dataclasses import asdict, fields
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .controller import MODES, PHASE_MODES, Controller, ControllerConfig, Decision
from .solax_cloud import SolaxCloudClient, SolaxCloudError
from .wallbox import DryRunWallbox, HacWallbox, WallboxState

log = logging.getLogger("pvwallbox")


class Service:
    def __init__(self, cfg: dict, dry_run: bool = False):
        self.cfg = cfg
        svc = cfg.get("service", {})
        self.cloud_interval = float(svc.get("cloud_interval_s", 60))
        self.loop_interval = float(svc.get("loop_interval_s", 15))
        self.state_file = Path(svc.get("state_file", "pvwallbox-state.json"))

        ctrl_keys = {f.name for f in fields(ControllerConfig)}
        ctrl_cfg = ControllerConfig(**{k: v for k, v in cfg.get("control", {}).items() if k in ctrl_keys})
        saved = self._load_saved()
        mode = saved.get("mode", cfg.get("control", {}).get("mode", "pv"))
        phase_mode = str(saved.get("phase_mode", ctrl_cfg.phase_mode))
        self.controller = Controller(
            ctrl_cfg,
            mode=mode if mode in MODES else "pv",
            phase_mode=phase_mode if phase_mode in PHASE_MODES else ctrl_cfg.phase_mode,
        )

        sc = cfg["solax_cloud"]
        self.cloud = SolaxCloudClient(
            token_id=os.environ.get("SOLAX_TOKEN_ID", sc.get("token_id", "")),
            wifi_sn=sc["wifi_sn"],
            api_version=int(sc.get("api_version", 2)),
        )
        wb = cfg["wallbox"]
        dry_run = dry_run or bool(wb.get("dry_run", False))
        self.wallbox = (DryRunWallbox(self.controller.state.phases, ctrl_cfg.voltage) if dry_run
                        else HacWallbox(wb["host"], int(wb.get("port", 502)), int(wb.get("unit_id", 1))))

        self.ev_power_samples: deque[float] = deque(maxlen=60)
        self.last_cloud_poll = -1e9
        self.last_pv = None
        self.last_wb: WallboxState | None = None
        self.last_decision: Decision | None = None
        self.commanded_on: bool | None = None
        self.last_upload: str | None = None
        self.last_error: str | None = None
        self.lock = threading.Lock()
        self.stop_event = threading.Event()

    # -- persistence of the user-selected modes -----------------------------------
    def _load_saved(self) -> dict:
        try:
            data = json.loads(self.state_file.read_text())
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def _save(self) -> None:
        try:
            self.state_file.write_text(json.dumps(
                {"mode": self.controller.mode, "phase_mode": self.controller.phase_mode}))
        except OSError as exc:
            log.warning("could not persist settings: %s", exc)

    def set_mode(self, mode: str) -> None:
        if mode not in MODES:
            raise ValueError(f"unknown mode {mode!r}, allowed: {MODES}")
        with self.lock:
            self.controller.mode = mode
            self._save()
        log.info("Mode changed to %s", mode)

    def set_phase_mode(self, phase_mode) -> None:
        phase_mode = str(phase_mode).lower()
        if phase_mode not in PHASE_MODES:
            raise ValueError(f"unknown phase mode {phase_mode!r}, allowed: {PHASE_MODES}")
        with self.lock:
            self.controller.phase_mode = phase_mode
            self._save()
        log.info("Phase mode changed to %s", phase_mode)

    # -- one control cycle ---------------------------------------------------------
    def step(self) -> None:
        now = time.monotonic()
        with self.lock:
            try:
                wb = self.wallbox.read_state()
            except Exception as exc:
                self.last_error = f"wallbox: {exc}"
                log.error("Wallbox read failed: %s", exc)
                return
            self.last_wb = wb
            self.ev_power_samples.append(wb.power_w)

            if now - self.last_cloud_poll >= self.cloud_interval:
                self.last_cloud_poll = now
                try:
                    pv = self.cloud.fetch()
                    self.last_pv = pv
                    # average EV power over the last cloud interval approximates
                    # what the car drew when the inverter took its sample
                    ev_avg = sum(self.ev_power_samples) / len(self.ev_power_samples)
                    self.controller.feed_sample(now, pv.upload_time, pv.pv_power_w,
                                                pv.feedin_power_w, pv.battery_power_w, ev_avg)
                    if pv.upload_time != self.last_upload:
                        self.last_upload = pv.upload_time
                        self.ev_power_samples.clear()
                        self.ev_power_samples.append(wb.power_w)
                    self.last_error = None
                except SolaxCloudError as exc:
                    self.last_error = f"cloud: {exc}"
                    log.warning("SolaX Cloud: %s", exc)

            decision = self.controller.decide(now, wb.car_connected)
            self.last_decision = decision
            self._apply(decision, wb)

    def _apply(self, d: Decision, wb: WallboxState) -> None:
        try:
            if (wb.car_connected and getattr(self.wallbox, "phase_switching_supported", False)
                    and wb.phase_setting != d.phases):
                self.wallbox.set_phases(d.phases)
            if d.charge:
                if wb.current_setpoint_a is None or abs(wb.current_setpoint_a - d.current_a) >= 0.5:
                    self.wallbox.set_current(d.current_a)
                if self.commanded_on is not True:
                    self.wallbox.ensure_fast_mode()
                    self.wallbox.start()
                    self.commanded_on = True
            elif wb.car_connected and self.commanded_on is not False:
                self.wallbox.stop()
                self.commanded_on = False
            if not wb.car_connected:
                self.commanded_on = None
        except Exception as exc:
            self.last_error = f"wallbox write: {exc}"
            log.error("Wallbox write failed: %s", exc)
            return
        log.info("%-5s %s | surplus=%s W | EV=%.0f W (%s) -> %s %.0f A %d-phase",
                 self.controller.mode, d.reason,
                 "n/a" if d.surplus_w is None else f"{d.surplus_w:.0f}",
                 wb.power_w, wb.run_mode_name, "ON" if d.charge else "OFF", d.current_a, d.phases)

    def status(self) -> dict:
        with self.lock:
            pv = self.last_pv
            return {
                "mode": self.controller.mode,
                "modes": list(MODES),
                "phase_mode": self.controller.phase_mode,
                "phase_modes": list(PHASE_MODES),
                "phase_switching_supported": getattr(self.wallbox, "phase_switching_supported", None),
                "decision": asdict(self.last_decision) if self.last_decision else None,
                "wallbox": None if not self.last_wb else {
                    **asdict(self.last_wb), "run_mode_name": self.last_wb.run_mode_name},
                "pv": None if not pv else {
                    "pv_power_w": pv.pv_power_w, "feedin_power_w": pv.feedin_power_w,
                    "battery_power_w": pv.battery_power_w, "battery_soc": pv.battery_soc,
                    "upload_time": pv.upload_time, "inverter_status": pv.inverter_status},
                "data_fresh": self.controller.data_is_fresh(time.monotonic()),
                "error": self.last_error,
            }

    def run(self) -> None:
        log.info("Starting PV wallbox control (mode=%s)", self.controller.mode)
        while not self.stop_event.is_set():
            self.step()
            self.stop_event.wait(self.loop_interval)
        self.wallbox.close()


# -- tiny web UI -----------------------------------------------------------------
PAGE = (Path(__file__).with_name("status.html")).read_text(encoding="utf-8")


def make_handler(service: Service):
    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, body: bytes, ctype: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/api/status":
                self._send(200, json.dumps(service.status()).encode(), "application/json")
            elif self.path in ("/", "/index.html"):
                self._send(200, PAGE.encode(), "text/html; charset=utf-8")
            else:
                self._send(404, b"not found", "text/plain")

        def do_POST(self):
            if self.path not in ("/api/mode", "/api/phase"):
                return self._send(404, b"not found", "text/plain")
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length) or b"{}")
                if self.path == "/api/mode":
                    service.set_mode(body.get("mode", ""))
                else:
                    service.set_phase_mode(body.get("phase_mode", ""))
            except (ValueError, AttributeError) as exc:
                return self._send(400, json.dumps({"error": str(exc)}).encode(), "application/json")
            self._send(200, json.dumps(service.status()).encode(), "application/json")

        def log_message(self, *args):
            pass

    return Handler


def main() -> None:
    ap = argparse.ArgumentParser(description="PV-surplus charging for SolaX X1/X3-HAC using SolaX Cloud data")
    ap.add_argument("-c", "--config", default="config.toml")
    ap.add_argument("--dry-run", action="store_true", help="do not write to the wallbox")
    ap.add_argument("--once", action="store_true", help="run a single cycle and print status")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    with open(args.config, "rb") as fh:
        cfg = tomllib.load(fh)
    service = Service(cfg, dry_run=args.dry_run)

    if args.once:
        service.step()
        print(json.dumps(service.status(), indent=2, ensure_ascii=False))
        return

    web = cfg.get("web", {})
    if web.get("enabled", True):
        httpd = ThreadingHTTPServer((web.get("bind", "0.0.0.0"), int(web.get("port", 8080))), make_handler(service))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        log.info("Web UI on http://%s:%s", web.get("bind", "0.0.0.0"), web.get("port", 8080))

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: service.stop_event.set())
    service.run()


if __name__ == "__main__":
    main()
