import unittest

from pvwallbox.controller import Controller, ControllerConfig
from pvwallbox.solax_cloud import parse_result


def make(**kw):
    cfg = ControllerConfig(start_delay_s=300, stop_delay_s=600, min_on_s=900, min_off_s=300,
                           smoothing=1.0, reserve_w=0, allow_grid_w=300, **kw)
    return Controller(cfg)


class ControllerTest(unittest.TestCase):
    def feed(self, c, t, feedin, ev=0.0, pv=8000, bat=0.0):
        c.feed_sample(t, str(t), pv, feedin, bat, ev)

    def test_start_requires_stable_surplus(self):
        c = make()
        self.feed(c, 0, 5000)
        self.assertFalse(c.decide(0, True).charge)
        self.feed(c, 120, 5000)
        self.assertFalse(c.decide(120, True).charge)
        self.feed(c, 300, 5000)
        d = c.decide(300, True)
        self.assertTrue(d.charge)
        self.assertEqual(d.current_a, 7)  # 5000 / 690 = 7.2 -> 7 A

    def test_too_little_surplus_never_starts(self):
        c = make()
        for t in range(0, 3600, 60):
            self.feed(c, t, 3000)  # < 6 A * 3 * 230 = 4140 W
            self.assertFalse(c.decide(t, True).charge)

    def test_current_follows_surplus_including_ev_power(self):
        c = make()
        for t in (0, 300):
            self.feed(c, t, 6000)
            c.decide(t, True)
        # car now draws 4140 W, export dropped to 3000 W -> real surplus 7140 W -> 10 A
        self.feed(c, 360, 3000, ev=4140)
        d = c.decide(360, True)
        self.assertTrue(d.charge)
        self.assertEqual(d.current_a, 10)

    def test_clamped_to_max(self):
        c = make()
        for t in (0, 300):
            self.feed(c, t, 20000)
            d = c.decide(t, True)
        self.assertEqual(d.current_a, 16)

    def test_stop_after_delay_and_min_on(self):
        c = make()
        for t in (0, 300):
            self.feed(c, t, 6000)
            c.decide(t, True)
        # clouds: car draws 4140 W, grid import 2000 W -> surplus 2140 W
        self.feed(c, 400, -2000, ev=4140)
        d = c.decide(400, True)
        self.assertTrue(d.charge)
        self.assertEqual(d.current_a, 6)
        self.feed(c, 1000, -2000, ev=4140)
        self.assertTrue(c.decide(1000, True).charge)   # 600 s waited, but min_on (900) not reached
        self.feed(c, 1200, -2001, ev=4140)
        self.assertFalse(c.decide(1200, True).charge)  # now stops

    def test_small_grid_draw_tolerated(self):
        c = make()
        for t in (0, 300):
            self.feed(c, t, 6000)
            c.decide(t, True)
        for t in range(360, 5000, 60):
            self.feed(c, t, -200, ev=4140)              # 3940 W surplus, 200 W import -> tolerated
            self.assertTrue(c.decide(t, True).charge)

    def test_battery_discharge_not_used(self):
        c = make()
        c.feed_sample(0, "a", 3000, 0, -2000, 4140)     # battery feeds the car
        self.assertLess(c.state.surplus_w, c.cfg.min_power_w)

    def test_stale_data(self):
        c = make()
        self.feed(c, 0, 8000)
        c.decide(0, True)
        c.decide(300, True)
        d = c.decide(2000, True)                        # no new sample for > 900 s
        self.assertFalse(d.charge)
        self.assertIn("stale", d.reason)

    def test_duplicate_samples_ignored(self):
        c = make()
        c.feed_sample(0, "same", 0, 5000, 0, 0)
        c.feed_sample(100, "same", 0, 0, 0, 0)
        self.assertEqual(c.state.surplus_w, 5000)
        self.assertEqual(c.state.last_sample_at, 0)

    def test_pv_minus_base_without_meter(self):
        c = make(surplus_source="pv_minus_base", base_load_w=500)
        c.feed_sample(0, "a", 6000, None, 0, 0)
        self.assertEqual(c.state.surplus_w, 5500)

    def test_modes(self):
        c = make()
        c.mode = "fast"
        self.assertEqual(c.decide(0, True).current_a, 16)
        c.mode = "minpv"
        d = c.decide(10, True)
        self.assertTrue(d.charge)
        self.assertEqual(d.current_a, 6)
        c.mode = "off"
        self.assertFalse(c.decide(20, True).charge)
        c.mode = "fast"
        self.assertFalse(c.decide(30, False).charge)   # no car

    def test_one_phase(self):
        c = make(phases=1)
        for t in (0, 300):
            self.feed(c, t, 2000)
            d = c.decide(t, True)
        self.assertTrue(d.charge)
        self.assertEqual(d.current_a, 8)


class ParseTest(unittest.TestCase):
    def test_parse(self):
        pv = parse_result({"acpower": 5230, "feedinpower": -120.0, "batPower": None,
                           "soc": None, "uploadTime": "2026-11-01 12:05:00", "inverterStatus": "102"})
        self.assertEqual(pv.pv_power_w, 5230)
        self.assertEqual(pv.feedin_power_w, -120)
        self.assertEqual(pv.battery_power_w, 0)


if __name__ == "__main__":
    unittest.main()
