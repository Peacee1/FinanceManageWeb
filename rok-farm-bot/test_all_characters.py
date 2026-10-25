import json
import queue
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from bot import App
from characters import Character
from round_state import RoundState


class AllCharactersSchedulerTests(unittest.TestCase):
    def test_completed_character_is_not_logged_in_again(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            chars = [Character(name, name, '2771', (600, 300)) for name in ['A', 'B', 'C']]
            app = App.__new__(App)
            app.stop = threading.Event()
            app.messages = queue.Queue()
            app.vision = object()
            app.settings = {'allocations': {'wood': 2, 'stone': 2, 'food': 1, 'gold': 0},
                            'level': 6, 'repeat_hours': 2}
            signature = json.dumps({'allocations': app.settings['allocations'], 'level': 6}, sort_keys=True)
            journal = RoundState(root / 'round-progress.json', signature)
            journal.roster(chars)
            journal.finish('A', 5, 7)
            navigator = Mock()
            navigator.scan.return_value = chars
            app.run_auto = Mock(return_value=(5, 7))
            app.active = lambda: True
            app.game = SimpleNamespace(focus=lambda: None)
            def log(text):
                if text.startswith('Hoàn tất tất cả nhân vật'):
                    app.stop.set()
            app.log = log
            with patch('bot.ROOT', root), patch('bot.CharacterNavigator', return_value=navigator):
                app.run_all_characters()
            navigator.scan.assert_not_called()
            self.assertEqual([call.args[0].identity for call in navigator.select.call_args_list], ['B', 'C'])
            self.assertEqual(app.run_auto.call_count, 2)
            self.assertTrue(all(app.journal.completed(name) for name in ['A', 'B', 'C']))
            self.assertIsNotNone(app.journal.data['next_at'])


if __name__ == '__main__':
    unittest.main()
