"""Verbindungstest: prüft Konfiguration, SolaX Cloud und Wallbox Schritt für Schritt.

Aufruf:  python3 -m pvwallbox.main --check          (nur lesen)
         python3 -m pvwallbox.main --check-write    (zusätzlich Schreibtest)
"""

from __future__ import annotations

import errno
import os
import socket
import sys
import time
import tomllib
from datetime import datetime

from . import wallbox as W
from .modbus_tcp import ModbusError, ModbusTcpClient, to_signed16
from .solax_cloud import SolaxCloudClient, SolaxCloudError

UNIT_IDS_TO_PROBE = [1, 0, 2, 3, 4, 5, 70, 100, 247, 255]

_color = sys.stdout.isatty()


def _c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _color else text


class Report:
    def __init__(self):
        self.failed = 0
        self.warned = 0

    def section(self, title: str) -> None:
        print(f"\n{_c('1', title)}")

    def ok(self, msg: str) -> None:
        print(f"  {_c('32', '✓')} {msg}")

    def info(self, msg: str) -> None:
        print(f"    {msg}")

    def warn(self, msg: str, *hints: str) -> None:
        self.warned += 1
        print(f"  {_c('33', '!')} {msg}")
        for h in hints:
            print(f"    → {h}")

    def fail(self, msg: str, *hints: str) -> None:
        self.failed += 1
        print(f"  {_c('31', '✗')} {msg}")
        for h in hints:
            print(f"    → {h}")


# --------------------------------------------------------------------------------
def check_config(r: Report, path: str) -> dict | None:
    r.section("1. Konfiguration")
    try:
        with open(path, "rb") as fh:
            cfg = tomllib.load(fh)
    except FileNotFoundError:
        r.fail(f"Datei {path} nicht gefunden",
               "cp config.example.toml config.toml  und Werte eintragen")
        return None
    except tomllib.TOMLDecodeError as exc:
        r.fail(f"{path} ist fehlerhaft: {exc}", "Anführungszeichen und = prüfen")
        return None
    r.ok(f"{path} gelesen")
    for section in ("solax_cloud", "wallbox"):
        if section not in cfg:
            r.fail(f"Abschnitt [{section}] fehlt", "Vorlage: config.example.toml")
    return cfg


def check_cloud(r: Report, cfg: dict) -> None:
    r.section("2. SolaX Cloud")
    sc = cfg.get("solax_cloud", {})
    token = os.environ.get("SOLAX_TOKEN_ID", sc.get("token_id", ""))
    sn = sc.get("wifi_sn", "")
    if not token or token == "DEIN_TOKEN":
        r.fail("Kein API-Token eingetragen",
               "solaxcloud.com → Service → API → Token kopieren und als token_id eintragen")
        return
    if not sn:
        r.fail("wifi_sn fehlt", "Registriernummer des Datenloggers eintragen (steht auf dem Stick)")
        return

    client = SolaxCloudClient(token, sn, int(sc.get("api_version", 2)))
    try:
        pv = client.fetch()
    except SolaxCloudError as exc:
        text = str(exc)
        if "request failed" in text:
            r.fail(f"SolaX Cloud nicht erreichbar: {text}",
                   "Internetverbindung des Rechners prüfen",
                   "Firewall/Proxy? Ziel: global.solaxcloud.com (HTTPS, Port 443)")
        else:
            other = 1 if client.api_version == 2 else 2
            r.fail(f"Cloud antwortet mit Fehler: {text}",
                   "Token und wifi_sn prüfen (wifi_sn = Nummer des Datenloggers, nicht des Wechselrichters)",
                   f"ggf. api_version = {other} in der Config ausprobieren")
        return

    r.ok("Verbindung und Token in Ordnung")
    r.info(f"PV-Leistung:     {pv.pv_power_w:.0f} W")
    r.info(f"Netz/Einspeisung: {'–' if pv.feedin_power_w is None else f'{pv.feedin_power_w:.0f} W'}")
    r.info(f"Datenstand:      {pv.upload_time or 'unbekannt'}")

    try:
        age = (datetime.now() - datetime.strptime(pv.upload_time, "%Y-%m-%d %H:%M:%S")).total_seconds()
    except ValueError:
        age = None
    stale = float(cfg.get("control", {}).get("stale_after_s", 900))
    if age is not None and age > stale:
        r.warn(f"Daten sind {age / 60:.0f} Minuten alt – Wechselrichter oder Datenlogger offline?",
               "In der SolaX-App prüfen, ob X3-MIC und Pocket LAN 'online' sind",
               "Pocket LAN: LAN-Kabel / Router-Port prüfen, Stick ab- und wieder anstecken")
    elif age is not None:
        r.ok(f"Daten aktuell ({max(age, 0) / 60:.0f} min alt)")

    source = cfg.get("control", {}).get("surplus_source", "feedin")
    if source == "feedin" and (pv.feedin_power_w is None or (pv.feedin_power_w == 0 and pv.pv_power_w > 200)):
        r.warn("Die Cloud liefert keine Einspeiseleistung, obwohl PV erzeugt wird",
               "Vermutlich ist kein Netzzähler/CT am Wechselrichter angeschlossen",
               'Ohne Zähler: surplus_source = "pv_minus_base" und base_load_w setzen')


def check_network(r: Report, host: str, port: int) -> bool:
    r.section("3. Netzwerkverbindung zur Wallbox")
    if not host:
        r.fail("host fehlt in [wallbox]", "IP-Adresse der Wallbox aus dem Router eintragen")
        return False
    t0 = time.monotonic()
    try:
        socket.create_connection((host, port), timeout=5).close()
    except socket.gaierror:
        r.fail(f"Name {host!r} kann nicht aufgelöst werden", "Besser die IP-Adresse eintragen, z. B. 192.168.178.50")
        return False
    except ConnectionRefusedError:
        r.fail(f"{host} ist erreichbar, aber Port {port} ist geschlossen",
               "Modbus TCP ist an der Wallbox nicht aktiv: in der SolaX-App bei den Wallbox-Einstellungen "
               "nach 'Modbus TCP' / 'Third-party' / 'EMS' suchen und einschalten",
               "Gibt es die Option nicht, bietet die Wallbox Modbus nicht über WLAN an → "
               "RS485-zu-LAN-Adapter an den RS485-Klemmen verwenden (siehe README)",
               "Stimmt die IP? Evtl. antwortet ein anderes Gerät unter dieser Adresse")
        return False
    except (socket.timeout, TimeoutError):
        r.fail(f"Keine Antwort von {host}:{port} (Timeout)",
               "IP-Adresse im Router prüfen – hat die Wallbox eine neue IP bekommen? Feste IP vergeben!",
               "Ist die Wallbox im WLAN? (In der App grünes WLAN-Symbol)",
               "Gast-WLAN oder 'WLAN-Geräte dürfen untereinander kommunizieren' aus? "
               "Dann sehen sich Rechner und Wallbox nicht")
        return False
    except OSError as exc:
        if exc.errno in (errno.EHOSTUNREACH, errno.ENETUNREACH):
            r.fail(f"{host} ist aus diesem Netz nicht erreichbar ({exc.strerror})",
                   "Liegen Rechner und Wallbox im selben Netz (z. B. beide 192.168.178.x)?")
        else:
            r.fail(f"Verbindung fehlgeschlagen: {exc}")
        return False
    r.ok(f"{host}:{port} erreichbar ({(time.monotonic() - t0) * 1000:.0f} ms)")
    return True


def _probe(host: str, port: int, unit: int, timeout: float) -> tuple[str, object]:
    client = ModbusTcpClient(host, port, unit, timeout=timeout)
    try:
        return "ok", client.read_input_registers(W.REG_IN_RUN_MODE)[0]
    except ModbusError as exc:
        return "exception", exc
    except OSError as exc:
        return "timeout", exc
    finally:
        client.close()


def check_modbus(r: Report, host: str, port: int, unit: int) -> ModbusTcpClient | None:
    r.section("4. Modbus-Kommunikation")
    status, result = _probe(host, port, unit, timeout=3)

    if status == "exception" and result.code in (0x0A, 0x0B):
        r.fail(f"Gateway meldet: Gerät antwortet nicht (Modbus-Fehler {result.code})",
               "Das ist ein RS485-Adapter, der die Wallbox nicht erreicht:",
               "A/B-Adern vertauscht? Baudrate (meist 9600 8N1) und unit_id im Adapter/der Config prüfen")
        return None
    if status == "exception":
        r.fail(f"Gerät antwortet, kennt aber das Zustandsregister nicht (Modbus-Fehler {result.code})",
               "Ist unter dieser IP wirklich die Wallbox? (Der Wechselrichter spricht auch Modbus)",
               "Andere Firmware/Registerkarte – bitte Ausgabe mit -v melden")
        return None
    if status == "timeout":
        r.warn(f"Keine Modbus-Antwort mit unit_id = {unit}. Suche andere Adressen …")
        found = None
        for candidate in UNIT_IDS_TO_PROBE:
            if candidate == unit:
                continue
            print(f"    teste unit_id {candidate} …", end="\r", flush=True)
            if _probe(host, port, candidate, timeout=2)[0] in ("ok", "exception"):
                found = candidate
                break
        print(" " * 40, end="\r")
        if found is None:
            r.fail("Auf keiner üblichen Modbus-Adresse eine Antwort",
                   "Modbus-Adresse in der SolaX-App (Wallbox-Einstellungen) nachsehen und als unit_id eintragen",
                   "Port 502 ist offen, aber das Gerät spricht evtl. kein Modbus über dieses Interface")
            return None
        r.fail(f"Wallbox antwortet auf unit_id = {found}", f"In config.toml unter [wallbox] unit_id = {found} setzen")
        unit = found

    client = ModbusTcpClient(host, port, unit)
    try:
        power = to_signed16(client.read_input_registers(W.REG_IN_CHARGE_POWER)[0])
        state = client.read_input_registers(W.REG_IN_RUN_MODE)[0]
        current = client.read_holding_registers(W.REG_HOLD_CHARGE_CURRENT)[0] / 100
        use_mode = client.read_holding_registers(W.REG_HOLD_USE_MODE)[0]
    except (ModbusError, OSError) as exc:
        r.fail(f"Lesen der Wallbox-Werte fehlgeschlagen: {exc}")
        client.close()
        return None

    r.ok(f"Modbus antwortet (unit_id {unit})")
    r.info(f"Zustand:        {W.RUN_MODES.get(state, f'unbekannt ({state})')}")
    r.info(f"Ladeleistung:   {power} W")
    r.info(f"Ladestrom-Soll: {current:.1f} A")
    r.info(f"Betriebsart:    {({0: 'Stop', 1: 'Fast', 2: 'ECO', 3: 'Green'}).get(use_mode, use_mode)}")

    if state not in W.RUN_MODES or not (0 <= current <= 80) or abs(power) > 25000:
        r.warn("Werte sehen unplausibel aus – passt die Registerkarte zu dieser Wallbox?",
               "Ausgabe bitte mit -v melden, bevor der Dienst scharf geschaltet wird")
    else:
        r.ok("Werte plausibel")
    if use_mode in (2, 3):
        r.info("Hinweis: ECO/Green aktiv – der Dienst stellt beim ersten Ladestart auf 'Fast' um.")
    return client


def check_phases(r: Report, client: ModbusTcpClient, cfg: dict) -> None:
    r.section("5. Phasenumschaltung")
    try:
        setting = client.read_holding_registers(W.REG_HOLD_PHASE_SWITCHING)[0]
        active = client.read_input_registers(W.REG_IN_CHARGING_PHASE)[0]
    except ModbusError:
        phase_mode = str(cfg.get("control", {}).get("phase_mode", cfg.get("control", {}).get("phases", 3)))
        r.warn("Wallbox kennt die Phasen-Register nicht (ältere Firmware?)",
               "Phase fest in der SolaX-App einstellen und phase_mode in der Config passend setzen",
               f"Aktuell eingestellt: phase_mode = \"{phase_mode}\""
               + (" – 'auto' funktioniert so nicht!" if phase_mode == "auto" else ""))
        return
    except OSError as exc:
        r.fail(f"Lesen fehlgeschlagen: {exc}")
        return
    names = {0: "deaktiviert", 1: "einphasig", 2: "dreiphasig", 3: "Auto (Wallbox)"}
    r.ok("Phasenumschaltung wird unterstützt")
    r.info(f"Vorgabe:  {names.get(setting, setting)}")
    r.info(f"Aktuell:  {({0: 'lädt nicht', 1: 'einphasig', 2: 'dreiphasig'}).get(active, active)}")


def check_write(r: Report, client: ModbusTcpClient) -> None:
    r.section("6. Schreibtest")
    try:
        raw = client.read_holding_registers(W.REG_HOLD_CHARGE_CURRENT)[0]
        client.write_register(W.REG_HOLD_CHARGE_CURRENT, raw)  # same value -> no change for the car
        back = client.read_holding_registers(W.REG_HOLD_CHARGE_CURRENT)[0]
    except ModbusError as exc:
        r.fail(f"Schreiben abgelehnt (Modbus-Fehler {exc.code})",
               "Modbus ist evtl. nur lesend freigegeben – in der SolaX-App Fernsteuerung/EMS erlauben")
        return
    except OSError as exc:
        r.fail(f"Schreiben fehlgeschlagen: {exc}")
        return
    if back == raw:
        r.ok(f"Ladestrom {raw / 100:.1f} A unverändert zurückgeschrieben – Schreibzugriff funktioniert")
    else:
        r.warn(f"Nach dem Schreiben steht {back / 100:.1f} A statt {raw / 100:.1f} A im Register")


def run_check(config_path: str, write_test: bool = False) -> int:
    r = Report()
    print(_c("1", "PV-Wallbox Verbindungstest"))
    cfg = check_config(r, config_path)
    if cfg is None:
        return 1
    check_cloud(r, cfg)

    wb = cfg.get("wallbox", {})
    host, port, unit = wb.get("host", ""), int(wb.get("port", 502)), int(wb.get("unit_id", 1))
    if check_network(r, host, port):
        client = check_modbus(r, host, port, unit)
        if client is not None:
            check_phases(r, client, cfg)
            if write_test:
                check_write(r, client)
            client.close()

    print()
    if r.failed:
        print(_c("31", f"{r.failed} Problem(e) gefunden – siehe Hinweise oben."))
        return 1
    if r.warned:
        print(_c("33", f"Grundsätzlich OK, aber {r.warned} Hinweis(e) beachten."))
    else:
        print(_c("32", "Alles in Ordnung – der Dienst kann starten."))
    if not write_test:
        print("Tipp: --check-write prüft zusätzlich, ob die Wallbox Befehle annimmt.")
    return 0
