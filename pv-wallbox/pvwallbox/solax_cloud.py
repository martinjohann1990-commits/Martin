"""SolaX Cloud realtime data client.

Uses the official SolaX Cloud API (token from solaxcloud.com -> Service -> API).
Rate limits: max. 10 requests/minute, 10.000/day. The inverter pushes new
data roughly every 5 minutes, so polling every 60 s is plenty.
"""

from __future__ import annotations

import json
import logging
import ssl
import urllib.parse
import urllib.request
from dataclasses import dataclass

log = logging.getLogger(__name__)

V2_URL = "https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get"
V1_URL = "https://global.solaxcloud.com/proxyApp/proxy/api/getRealtimeInfo.do"


class SolaxCloudError(Exception):
    pass


@dataclass
class PvData:
    pv_power_w: float          # AC output of the inverter
    feedin_power_w: float | None  # grid: + = export, - = import (needs meter/CT)
    battery_power_w: float     # + = charging, - = discharging (0 without battery)
    battery_soc: float | None
    upload_time: str           # timestamp of the inverter upload (identifies new samples)
    inverter_status: str | None
    raw: dict


def _num(value) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def parse_result(result: dict) -> PvData:
    pv = _num(result.get("acpower"))
    if pv is None:
        dc = [_num(result.get(f"powerdc{i}")) for i in range(1, 5)]
        pv = sum(x for x in dc if x is not None)
    return PvData(
        pv_power_w=pv or 0.0,
        feedin_power_w=_num(result.get("feedinpower")),
        battery_power_w=_num(result.get("batPower")) or 0.0,
        battery_soc=_num(result.get("soc")),
        upload_time=str(result.get("uploadTime") or ""),
        inverter_status=None if result.get("inverterStatus") is None else str(result.get("inverterStatus")),
        raw=result,
    )


class SolaxCloudClient:
    def __init__(self, token_id: str, wifi_sn: str, api_version: int = 2, timeout: float = 15.0):
        self.token_id = token_id
        self.wifi_sn = wifi_sn
        self.api_version = api_version
        self.timeout = timeout
        self._ctx = ssl.create_default_context()

    def _http(self, req: urllib.request.Request) -> dict:
        with urllib.request.urlopen(req, timeout=self.timeout, context=self._ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _fetch_v2(self) -> dict:
        req = urllib.request.Request(
            V2_URL,
            data=json.dumps({"wifiSn": self.wifi_sn}).encode(),
            headers={"tokenId": self.token_id, "Content-Type": "application/json"},
            method="POST",
        )
        return self._http(req)

    def _fetch_v1(self) -> dict:
        qs = urllib.parse.urlencode({"tokenId": self.token_id, "sn": self.wifi_sn})
        return self._http(urllib.request.Request(f"{V1_URL}?{qs}"))

    def fetch(self) -> PvData:
        try:
            payload = self._fetch_v2() if self.api_version == 2 else self._fetch_v1()
        except Exception as exc:  # network, JSON, HTTP errors
            raise SolaxCloudError(f"request failed: {exc}") from exc
        if not payload.get("success") or not isinstance(payload.get("result"), dict):
            raise SolaxCloudError(f"API error: {payload.get('exception') or payload.get('code') or payload}")
        return parse_result(payload["result"])
