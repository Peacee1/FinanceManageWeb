import unittest
from unittest.mock import Mock

import numpy as np
import cv2
from pathlib import Path

from vision import Vision, normalize


class OCRDecisionTests(unittest.TestCase):
    def setUp(self):
        self.vision = Vision.__new__(Vision)
        self.vision.icons = {}
        self.screen = np.zeros((600, 1000, 3), dtype=np.uint8)
        self.screen[350:450, 400:650] = (255, 190, 0)
        self.button_box = [[420, 370], [610, 370], [610, 410], [420, 410]]

    def test_both_territory_flag_styles_at_multiple_window_sizes(self):
        assets = Path(__file__).parent / 'assets'
        self.vision.icons = {p.stem: cv2.imdecode(np.fromfile(p, dtype=np.uint8), 1)
                             for p in assets.glob('alliance_flag*.png')}
        self.assertIn('alliance_flag_laurel', self.vision.icons)
        for name, template in self.vision.icons.items():
            for scale in (1., .65, .5):
                with self.subTest(style=name, scale=scale):
                    screen = np.zeros((round(994*scale), round(1770*scale), 3), np.uint8)
                    patch = cv2.resize(template, (round(template.shape[1]*scale), round(template.shape[0]*scale)))
                    x, y = round(1100*scale), round(480*scale)
                    h, w = patch.shape[:2]
                    screen[y:y+h, x:x+w] = patch
                    match = self.vision.icon('alliance_flag', screen, (x-10, y-10, w+20, h+20))
                    self.assertIsNotNone(match)
                    self.assertLessEqual(abs(match[1][0]-(x+w//2)), 2)
                    self.assertLessEqual(abs(match[1][1]-(y+h//2)), 2)

    def test_small_search_recognizes_resources_when_ocr_misses_labels(self):
        root = Path(__file__).parent
        self.vision.icons = {p.stem: cv2.imdecode(np.fromfile(p, dtype=np.uint8), 1)
                             for p in (root/'assets').glob('*.png')}
        screen = cv2.imdecode(np.fromfile(root/'test-fixtures/small-search.png', dtype=np.uint8), 1)
        box = [[255, 584], [320, 584], [320, 604], [255, 604]]
        for scale in (1., 1.5):
            with self.subTest(scale=scale):
                resized = cv2.resize(screen, None, fx=scale, fy=scale)
                obs = self.vision.from_rows(resized, [[(np.array(box)*scale).tolist(), 'TÌM KIẾM', .95]])
                self.assertEqual(obs.state, 'search')
                for key, x in [('food',379), ('wood',480), ('stone',577), ('gold',678)]:
                    self.assertIn(key, obs.buttons)
                    self.assertLess(abs(obs.buttons[key][0]-x*scale), 5)
                    self.assertGreater(obs.buttons[key][1], resized.shape[0]*.85)

    def test_level_ocr_typo_is_accepted_only_near_search_button(self):
        level_box = [[430, 320], [490, 320], [490, 340], [430, 340]]
        for label in ('C6p: 3', 'Cấp: 3', 'Cap: 8'):
            obs = self.vision.from_rows(self.screen, [[level_box, label, .82], [self.button_box, 'TÌM KIẾM', .95]])
            self.assertEqual(obs.level, int(label[-1]))
        far_box = [[40, 20], [100, 20], [100, 40], [40, 40]]
        obs = self.vision.from_rows(self.screen, [[far_box, 'C6p: 3', .82], [self.button_box, 'TÌM KIẾM', .95]])
        self.assertIsNone(obs.level)

    def test_action_buttons_accept_ocr_typo_with_colored_button(self):
        for text, key, state in [('Quanmdi','new_army','new'), ('Thu thap','gather','deposit'),
                                 ('Hanh qudn','march','march'), ('Tim klem','find','search')]:
            with self.subTest(text=text):
                obs=self.vision.from_rows(self.screen, [[self.button_box,text,.9]])
                self.assertEqual(obs.state,state)
                self.assertIn(key,obs.buttons)
        blank=np.zeros_like(self.screen)
        obs=self.vision.from_rows(blank, [[self.button_box,'Quanmdi',.9]])
        self.assertNotIn('new_army',obs.buttons)

    def test_start_prompt_is_detected_only_in_lower_screen(self):
        box = [[350,500],[650,500],[650,540],[350,540]]
        obs = self.vision.from_rows(self.screen, [[box,'Nhấn để bắt đầu',.95]])
        self.assertEqual(obs.state,'start_screen')
        self.assertIn('enter_game',obs.buttons)
        box = [[350,20],[650,20],[650,60],[350,60]]
        obs = self.vision.from_rows(self.screen, [[box,'Nhấn để bắt đầu',.95]])
        self.assertNotEqual(obs.state,'start_screen')

    def test_alliance_flag_with_notification_on_tall_window(self):
        root=Path(__file__).parent
        self.vision.icons={p.stem:cv2.imdecode(np.fromfile(p,dtype=np.uint8),1) for p in (root/'assets').glob('alliance_flag*.png')}
        screen=cv2.imdecode(np.fromfile(root/'test-fixtures/alliance-badge.png',dtype=np.uint8),1)
        match=self.vision.icon('alliance_flag',screen,(690,425,220,170))
        self.assertIsNotNone(match)
        self.assertLess(abs(match[1][0]-798),10)
        self.assertLess(abs(match[1][1]-532),15)

    def test_account_button_matches_icon_instead_of_title(self):
        root=Path(__file__).parent
        icon=cv2.imdecode(np.fromfile(root/'assets/account_button.png',dtype=np.uint8),1)
        self.vision.icons={'account_button':icon}
        screen=np.zeros((994,1770,3),np.uint8)
        screen[160:205,480:625]=icon
        found=self.vision.icon('account_button',screen,(1770*.22,994*.10,1770*.43,994*.23))
        self.assertIsNotNone(found)
        self.assertLess(abs(found[1][0]-552),3)
        self.assertGreater(found[1][1],150)

    def test_vietnamese_accents(self):
        self.assertEqual(normalize('TÌM KIẾM'), 'timkiem')
        self.assertEqual(normalize('Đất trồng'), 'dattrong')

    def test_actual_button_position_is_used(self):
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'TÌM KIẾM', .95]])
        self.assertEqual(obs.state, 'search')
        self.assertEqual(obs.buttons['find'], (515, 390))

    def test_header_does_not_become_clickable_button(self):
        box = [[420, 50], [610, 50], [610, 90], [420, 90]]
        obs = self.vision.from_rows(self.screen, [[box, 'Quân mới', .95]])
        self.assertNotIn('new_army', obs.buttons)

    def test_all_queue_counts_without_six_templates(self):
        for count in range(6):
            obs = self.vision.from_rows(self.screen, [[self.button_box, f'Hàng đợi {count}/5', .96]])
            self.assertEqual(obs.queue, count)
        obs = self.vision.from_rows(self.screen, [[self.button_box, '(0/5) Dọn cây', .96]])
        self.assertIsNone(obs.queue)

    def test_ambiguous_buttons_are_rejected(self):
        row = [self.button_box, 'Thu thập', .95]
        obs = self.vision.from_rows(self.screen, [row, row])
        self.assertIsNone(obs.buttons['gather'])

    def test_occupied_or_unreadable_deposit_is_rejected(self):
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Thu thập', .95]])
        self.assertEqual(obs.state, 'deposit')
        self.assertFalse(obs.free)

    def test_low_confidence_queue_is_rejected(self):
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Hàng đợi 0/5', .50]])
        self.assertIsNone(obs.queue)

    def test_accounts_with_four_marches(self):
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Hàng đợi 3/4', .96]])
        self.assertEqual((obs.queue, obs.capacity), (3, 4))

    def test_seven_march_capacity(self):
        for count in range(8):
            obs = self.vision.from_rows(self.screen, [[self.button_box, f'Hàng đợi {count}/7', .96]])
            self.assertEqual((obs.queue, obs.capacity), (count, 7))

    def test_invalid_counter_is_rejected(self):
        for label in ['Hàng đợi 7/4', 'Hàng đợi 15/7', 'Hàng đợi 5/70']:
            obs = self.vision.from_rows(self.screen, [[self.button_box, label, .96]])
            self.assertIsNone(obs.queue)

    def test_sidebar_count_is_read_without_calibration(self):
        box = [[930, 80], [970, 80], [970, 100], [930, 100]]
        obs = self.vision.from_rows(self.screen, [[box, '3/4', .96]])
        self.assertEqual((obs.queue, obs.capacity), (3, 4))

    def test_cached_layout_reads_fresh_queue(self):
        self.vision.cache = {}
        self.vision.cache_file = None
        queue_box = [[800, 150], [950, 150], [950, 180], [800, 180]]
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Quân mới', .96],
                                                [queue_box, 'Hàng đợi 5/7', .96]])
        self.vision.remember(self.screen, obs)
        self.vision.engine = Mock()
        self.vision.engine.text_rec.return_value = ([('Hàng đợi 6/7', .99)], 0)
        cached = self.vision.cached_observation(self.screen)
        self.assertEqual((cached.queue, cached.capacity), (6, 7))
        self.vision.engine.assert_not_called()

    def test_moved_layout_discards_cached_position(self):
        self.vision.cache = {}
        self.vision.cache_file = None
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Hành quân', .96]])
        self.vision.remember(self.screen, obs)
        moved = np.zeros_like(self.screen)
        self.assertIsNone(self.vision.cached_observation(moved))

    def test_resized_window_discards_cached_position(self):
        self.vision.cache = {}
        self.vision.cache_file = None
        obs = self.vision.from_rows(self.screen, [[self.button_box, 'Hành quân', .96]])
        self.vision.remember(self.screen, obs)
        self.assertIsNone(self.vision.cached_observation(self.screen[:500]))


if __name__ == '__main__':
    unittest.main()
