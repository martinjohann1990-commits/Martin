"""Minimal Modbus-TCP client (stdlib only).

Supports exactly what the wallbox controller needs:
  * 0x03 Read Holding Registers
  * 0x04 Read Input Registers
  * 0x06 Write Single Register
"""

from __future__ import annotations

import socket
import struct
import threading


class ModbusError(Exception):
    def __init__(self, message: str, code: int | None = None):
        super().__init__(message)
        self.code = code  # Modbus exception code (1 = illegal function, 2 = illegal address, ...)


class ModbusTcpClient:
    def __init__(self, host: str, port: int = 502, unit_id: int = 1, timeout: float = 5.0):
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.timeout = timeout
        self._sock: socket.socket | None = None
        self._tid = 0
        self._lock = threading.Lock()

    # -- connection handling -------------------------------------------------
    def _connect(self) -> socket.socket:
        if self._sock is None:
            self._sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
            self._sock.settimeout(self.timeout)
        return self._sock

    def close(self) -> None:
        if self._sock is not None:
            try:
                self._sock.close()
            finally:
                self._sock = None

    def _recv_exact(self, sock: socket.socket, n: int) -> bytes:
        buf = b""
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("connection closed by wallbox")
            buf += chunk
        return buf

    def _request(self, pdu: bytes) -> bytes:
        with self._lock:
            for attempt in (1, 2):
                try:
                    sock = self._connect()
                    self._tid = (self._tid + 1) & 0xFFFF
                    header = struct.pack(">HHHB", self._tid, 0, len(pdu) + 1, self.unit_id)
                    sock.sendall(header + pdu)
                    tid, _proto, length, _unit = struct.unpack(">HHHB", self._recv_exact(sock, 7))
                    body = self._recv_exact(sock, length - 1)
                    if tid != self._tid:
                        raise OSError(f"transaction id mismatch ({tid} != {self._tid})")
                except OSError:
                    self.close()       # broken connection: reconnect once and retry
                    if attempt == 2:
                        raise
                    continue
                if body[0] & 0x80:     # device answered with an exception: no retry
                    raise ModbusError(f"modbus exception code {body[1]} for function 0x{pdu[0]:02x}", body[1])
                return body
            raise ModbusError("unreachable")

    # -- public API ------------------------------------------------------------
    def _read(self, function: int, address: int, count: int) -> list[int]:
        body = self._request(struct.pack(">BHH", function, address, count))
        byte_count = body[1]
        data = body[2 : 2 + byte_count]
        return list(struct.unpack(f">{count}H", data))

    def read_holding_registers(self, address: int, count: int = 1) -> list[int]:
        return self._read(0x03, address, count)

    def read_input_registers(self, address: int, count: int = 1) -> list[int]:
        return self._read(0x04, address, count)

    def write_register(self, address: int, value: int) -> None:
        self._request(struct.pack(">BHH", 0x06, address, value & 0xFFFF))


def to_signed16(value: int) -> int:
    return value - 0x10000 if value & 0x8000 else value
