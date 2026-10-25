"""Regressions for small roster labels losing hashes / letters in OCR."""
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from characters import CharacterNavigator, extract_stars, roster_kingdom


def row(text, x, y, confidence=.96):
    return [[[x, y], [x+220, y], [x+220, y+18], [x, y+18]], text, confidence]


class RosterOCRLabelTests(unittest.TestCase):
    def test_visible_f12_survives_header_typos_and_missing_kingdom_hash(self):
        rows = [row('NHAN VAT MGOI SAO', 800, 220),
                row('HRAN VAET HUOHG', 800, 760),
                row('[ABC]FarmlX F11', 580, 300),
                row('#2771 Vuong quoc York', 580, 324),
                row('[ABC]FarmlX F12', 1050, 300),
                row('2771 Viong noc Yorkshire', 1050, 324, .797),
                row('FarmlX F13', 1050, 800),
                row('#2771 Vuong quoc York', 1050, 824)]
        chars, normal, stars = extract_stars(rows, (994, 1770, 3))
        self.assertTrue(stars)
        self.assertTrue(normal)
        self.assertEqual({c.name for c in chars}, {'FarmlX F11', 'FarmlX F12'})
        app = SimpleNamespace(vision=None, stop=threading.Event(), log=Mock())
        nav = CharacterNavigator(app)
        nav.open_list = Mock()
        nav.page = Mock(return_value=(chars, normal, stars, None, (0, 0)))
        nav.scroll_page = Mock(side_effect=AssertionError('Visible F12 must not scroll'))
        found, _, _ = nav.find('2771:farm1f12')
        self.assertEqual(found.name, 'FarmlX F12')
        nav.scroll_page.assert_not_called()

    def test_missing_hash_requires_confirmed_star_section(self):
        self.assertIsNone(roster_kingdom('2771 Vuong quoc York', False))
        self.assertEqual(roster_kingdom('2771 Vuong quoc York', True), '2771')

    def test_power_and_bare_numbers_are_not_kingdom_labels(self):
        for text in ['2771', '2771 Suc manh', '2771.123.456', '12345678 Vuong quoc York']:
            with self.subTest(text=text):
                self.assertIsNone(roster_kingdom(text, True))

    def test_low_confidence_kingdom_remains_rejected(self):
        rows = [row('NHAN VAT NGOI SAO', 800, 220), row('Farm F12', 1050, 300),
                row('2771 Vuong quoc York', 1050, 324, .60)]
        self.assertEqual(extract_stars(rows, (994, 1770, 3))[0], [])