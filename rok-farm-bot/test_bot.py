import threading
import time
import unittest
from unittest.mock import patch

import numpy as np

from bot import App, relative_position
from vision import Observation


class MovingSearchPanelTests(unittest.TestCase):
    def test_recent_button_reuses_ocr_only_when_queue_and_window_match(self):
        app=App.__new__(App)
        screen=np.full((400,600,3),180,np.uint8)
        observation=Observation(state='new',buttons={'new_army':(300,300)},queue=1,capacity=5,regions={'new_army':[280,285,40,30],'queue':[400,100,40,20]})
        app.snapshot=lambda:(screen.copy(),(10,20))
        app._recent_detection=(observation,screen,(10,20),time.monotonic())
        self.assertIs(app.recent_click_observation('new_army','new')[0],observation)
        app._recent_detection=(observation,screen,(10,20),time.monotonic())
        changed=screen.copy();changed[100:120,400:440]=0
        app.snapshot=lambda:(changed,(10,20))
        self.assertIsNone(app.recent_click_observation('new_army','new'))
        app.snapshot=lambda:(screen,(11,20))
        self.assertIsNone(app.recent_click_observation('new_army','new'))
        app._recent_detection=(observation,screen,(10,20),time.monotonic()-2)
        self.assertIsNone(app.recent_click_observation('new_army','new'))
    def test_controls_follow_selected_resource(self):
        app = App.__new__(App)
        app.stop = threading.Event()
        app.active = lambda: True
        app.settings = {'resource': 'wood'}
        app.cfg = {'points': {'wood': [875, 920], 'minus': [561, 710],
                              'plus': [831, 710], 'find': [695, 778]},
                   'anchors': {key: [695, 920] for key in ['minus', 'plus', 'find']}}
        with patch('bot.pg.click') as click:
            for key, expected in [('minus', (741, 710)), ('plus', (1011, 710)), ('find', (875, 778))]:
                app.click(key)
                click.assert_called_with(*expected)

    def test_search_recognition_moves_with_panel(self):
        app = App.__new__(App)
        pattern = np.random.default_rng(42).integers(40, 255, size=(12, 30, 3), dtype=np.uint8)
        app.templates = {'state:search': pattern}
        app.cfg = {'points': {'food': [70, 100], 'wood': [110, 100]},
                   'templates': {'state:search': {'region': [30, 20, 30, 12], 'anchor': [70, 100]}}}
        screen = np.zeros((140, 180, 3), dtype=np.uint8)
        screen[20:32, 70:100] = pattern
        self.assertTrue(app.matches('state:search', screen))

    def test_same_resource_keeps_original_position(self):
        self.assertEqual(relative_position([561, 710], [695, 920], [695, 920]), [561, 710])


if __name__ == '__main__':
    unittest.main()
