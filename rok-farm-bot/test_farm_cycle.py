import unittest

from farm_cycle import FarmCycle


class FarmCycleTests(unittest.TestCase):
    def test_two_wood_two_stone_one_food_then_repeat(self):
        cycle = FarmCycle({'wood': 2, 'stone': 2, 'food': 1, 'gold': 0})
        observed = []
        for _ in range(10):
            observed.append(cycle.current)
            cycle.confirm_dispatch()
        self.assertEqual(observed, ['wood', 'wood', 'stone', 'stone', 'food'] * 2)

    def test_wait_or_failed_dispatch_does_not_advance(self):
        cycle = FarmCycle({'wood': 2, 'stone': 2, 'food': 1, 'gold': 0})
        for _ in range(10):
            self.assertEqual(cycle.current, 'wood')
        self.assertEqual(cycle.cursor, 0)

    def test_resume_cursor(self):
        cycle = FarmCycle({'wood': 2, 'stone': 2, 'food': 1, 'gold': 0}, cursor=4)
        self.assertEqual(cycle.current, 'food')
        cycle.confirm_dispatch()
        self.assertEqual(cycle.current, 'wood')

    def test_zero_count_is_skipped(self):
        cycle = FarmCycle({'wood': 0, 'stone': 0, 'food': 0, 'gold': 3})
        self.assertEqual(cycle.plan, ['gold'] * 3)

    def test_invalid_total_and_counts(self):
        for counts in [{'wood': 0, 'stone': 0, 'food': 0, 'gold': 0},
                       {'wood': 4, 'stone': 4, 'food': 0, 'gold': 0},
                       {'wood': -1, 'stone': 2, 'food': 0, 'gold': 0}]:
            with self.assertRaises(ValueError):
                FarmCycle(counts)


if __name__ == '__main__':
    unittest.main()
