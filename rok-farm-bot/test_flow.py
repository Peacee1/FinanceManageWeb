import threading
import unittest
from unittest.mock import patch

from bot import App
from vision import Observation


class AutomaticNavigationTests(unittest.TestCase):
    def test_inside_space_outside_f_search_without_calibration(self):
        app = App.__new__(App)
        app.vision = object()
        app.stop = threading.Event()
        app.settings = {'probe': False, 'resource': 'food', 'level': 6, 'armies': 4, 'interval': 10}
        app.active = lambda: True
        app.log = lambda text: None
        frames = iter([Observation(state='inside'), Observation(state='outside', queue=3, capacity=4),
                       Observation(state='search', level=6), Observation(state='search', level=6)])
        app.detect = lambda: (next(frames), None, (0, 0))
        clicks = []
        def click(key, state):
            clicks.append(key)
            if key == 'find':
                app.stop.set()
        app.auto_click = click
        with patch('bot.pg.press') as press, patch.object(app.stop, 'wait', side_effect=lambda _: app.stop.is_set()):
            app.run_auto()
        self.assertEqual([call.args[0] for call in press.call_args_list], ['space', 'f'])
        self.assertEqual(clicks, ['food', 'find'])

    def test_already_outside_does_not_toggle_space(self):
        app = App.__new__(App)
        app.vision = object()
        app.stop = threading.Event()
        app.settings = {'probe': False, 'resource': 'food', 'level': 6, 'armies': 4, 'interval': 10}
        app.active = lambda: True
        app.log = lambda text: None
        app.detect = lambda: (Observation(state='outside', queue=3, capacity=4), None, (0, 0))
        def key(value):
            self.assertEqual(value, 'f')
            app.stop.set()
        with patch('bot.pg.press', side_effect=key) as press, patch.object(app.stop, 'wait', side_effect=lambda _: app.stop.is_set()):
            app.run_auto()
        press.assert_called_once_with('f')


if __name__ == '__main__':
    unittest.main()
