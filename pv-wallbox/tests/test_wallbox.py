"""Tests HacWallbox against an in-process fake Modbus-TCP server."""
import socket
import struct
import threading
import unittest

from pvwallbox.wallbox import HacWallbox


class FakeHac:
    def __init__(self):
        self.inp = {0x0B: (-5) & 0xFFFF, 0x1D: 2, 0xA02A: 2}
        self.hold = {0x060D: 2, 0x0628: 1600, 0x0627: 0, 0xA105: 2}
        self.supports_ems = True
        self.unit_id = 1          # requests for other unit ids are silently ignored
        self.srv = socket.socket()
        self.srv.bind(("127.0.0.1", 0))
        self.srv.listen()
        self.port = self.srv.getsockname()[1]
        threading.Thread(target=self.accept_loop, daemon=True).start()

    def accept_loop(self):
        while True:
            conn, _ = self.srv.accept()
            threading.Thread(target=self.serve, args=(conn,), daemon=True).start()

    def serve(self, conn):
        with conn:
            while True:
                hdr = conn.recv(7)
                if not hdr:
                    return
                tid, _, length, unit = struct.unpack(">HHHB", hdr)
                pdu = conn.recv(length - 1)
                if unit != self.unit_id:
                    continue
                fc, addr, val = struct.unpack(">BHH", pdu)
                if addr >= 0xA000 and not self.supports_ems:
                    resp = struct.pack(">BB", fc | 0x80, 2)  # illegal data address
                elif fc in (3, 4):
                    regs = [(self.hold if fc == 3 else self.inp).get(addr + i, 0) for i in range(val)]
                    resp = struct.pack(">BB", fc, 2 * val) + struct.pack(f">{val}H", *regs)
                elif fc == 6:
                    self.hold[addr] = val
                    resp = pdu
                conn.sendall(struct.pack(">HHHB", tid, 0, len(resp) + 1, unit) + resp)


class WallboxTest(unittest.TestCase):
    def test_read_and_write(self):
        fake = FakeHac()
        wb = HacWallbox("127.0.0.1", fake.port)
        st = wb.read_state()
        self.assertEqual(st.power_w, -5)
        self.assertTrue(st.charging)
        self.assertEqual(st.current_setpoint_a, 16.0)
        wb.ensure_fast_mode()
        wb.set_current(7)
        wb.stop()
        self.assertEqual((st.phase_setting, st.charging_phases), (3, 3))
        wb.set_phases(1)
        self.assertEqual(fake.hold[0xA105], 1)
        self.assertEqual(fake.hold[0x060D], 1)
        self.assertEqual(fake.hold[0x0628], 700)
        self.assertEqual(fake.hold[0x0627], 3)
        wb.close()


    def test_phase_switching_unsupported(self):
        fake = FakeHac()
        fake.supports_ems = False
        wb = HacWallbox("127.0.0.1", fake.port)
        st = wb.read_state()
        self.assertIsNone(st.phase_setting)
        self.assertFalse(wb.phase_switching_supported)
        self.assertEqual(st.power_w, -5)
        with self.assertRaises(Exception):
            wb.set_phases(1)
        wb.close()


if __name__ == "__main__":
    unittest.main()
