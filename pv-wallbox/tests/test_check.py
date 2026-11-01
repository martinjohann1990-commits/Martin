import contextlib
import io
import os
import socket
import tempfile
import unittest
from unittest import mock

from pvwallbox import check
from tests.test_wallbox import FakeHac

ORIG_PROBE = check._probe


def run(host, port, unit=1, write=False):
    cfg = (f'[solax_cloud]\ntoken_id = "DEIN_TOKEN"\nwifi_sn = "X"\n'
           f'[wallbox]\nhost = "{host}"\nport = {port}\nunit_id = {unit}\n[control]\nphase_mode = "auto"\n')
    with tempfile.NamedTemporaryFile("w", suffix=".toml", delete=False) as fh:
        fh.write(cfg)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out), mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("SOLAX_TOKEN_ID", None)
            rc = check.run_check(fh.name, write_test=write)
    finally:
        os.unlink(fh.name)
    return rc, out.getvalue()


class CheckTest(unittest.TestCase):
    def test_all_wallbox_steps_ok(self):
        fake = FakeHac()
        rc, out = run("127.0.0.1", fake.port, write=True)
        self.assertIn("Kein API-Token", out)            # cloud not configured in the test
        self.assertIn("erreichbar", out)
        self.assertIn("Modbus antwortet (unit_id 1)", out)
        self.assertIn("Charging", out)
        self.assertIn("Phasenumschaltung wird unterstützt", out)
        self.assertIn("Schreibzugriff funktioniert", out)
        self.assertEqual(fake.hold[0x0628], 1600)       # unchanged
        self.assertEqual(rc, 1)

    def test_port_closed(self):
        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        s.close()
        _, out = run("127.0.0.1", port)
        self.assertIn("Port", out)
        self.assertIn("geschlossen", out)
        self.assertIn("RS485", out)

    def test_wrong_unit_id_is_found(self):
        fake = FakeHac()
        fake.unit_id = 70
        fast_probe = lambda h, p, u, timeout: ORIG_PROBE(h, p, u, 0.3)  # noqa: E731
        with mock.patch.object(check, "UNIT_IDS_TO_PROBE", [1, 70]), \
             mock.patch.object(check, "_probe", side_effect=fast_probe):
            _, out = run("127.0.0.1", fake.port, unit=1)
        self.assertIn("unit_id = 70", out)

    def test_phase_registers_missing(self):
        fake = FakeHac()
        fake.supports_ems = False
        _, out = run("127.0.0.1", fake.port)
        self.assertIn("kennt die Phasen-Register nicht", out)
        self.assertIn("'auto' funktioniert so nicht", out)

if __name__ == "__main__":
    unittest.main()
