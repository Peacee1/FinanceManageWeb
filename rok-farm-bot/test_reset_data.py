import tempfile
import unittest
from pathlib import Path
import queue
from unittest.mock import Mock, patch

from bot import App

from reset_data import clear_bot_data


class ResetDataTests(unittest.TestCase):
    def test_clears_bot_state_and_cache_only(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'ROKFarmBot'
            root.mkdir()
            for filename in ['config.json', 'round-progress.json', 'bot.log']:
                (root / filename).write_text('data', 'utf-8')
            (root / 'vision-cache').mkdir()
            (root / 'vision-cache' / 'buttons.json').write_text('data', 'utf-8')
            outside = Path(folder) / 'keep.txt'
            outside.write_text('keep', 'utf-8')
            clear_bot_data(root)
            self.assertEqual(list(root.iterdir()), [])
            self.assertEqual(outside.read_text('utf-8'), 'keep')

    def test_wrong_directory_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'keep.txt'
            file.write_text('keep', 'utf-8')
            with self.assertRaises(ValueError):
                clear_bot_data(folder)
            self.assertTrue(file.exists())

    def test_reset_waits_for_running_worker(self):
        app = App.__new__(App)
        app.worker = Mock()
        app.worker.is_alive.return_value = True
        app.root = Mock()
        with patch('bot.clear_bot_data') as clear:
            app.finish_reset()
        clear.assert_not_called()
        app.root.after.assert_called_once_with(100, app.finish_reset)

    def test_reset_clears_memory_and_display_after_worker_stops(self):
        with tempfile.TemporaryDirectory() as folder:
            data = Path(folder) / 'ROKFarmBot'
            data.mkdir()
            (data / 'round-progress.json').write_text('{}', 'utf-8')
            app = App.__new__(App)
            app.worker = None
            app.vision = object()
            app.game = object()
            app.journal = object()
            app.cycle = object()
            app.settings = {}
            for field in ['resource', 'level', 'interval', 'repeat_hours', 'character_table', 'round_label', 'log_text', 'status']:
                setattr(app, field, Mock())
            app.allocations = {key: Mock() for key in ['food', 'wood', 'stone', 'gold']}
            app.character_table.get_children.return_value = ['old']
            app.update_allocation_total = Mock()
            app.messages = queue.Queue()
            app.messages.put('old log')
            with patch('bot.ROOT', data), patch('bot.messagebox.showerror') as show_error:
                app.finish_reset()
            show_error.assert_not_called()
            self.assertEqual(list(data.iterdir()), [])
            self.assertIsNone(app.vision)
            self.assertFalse(hasattr(app, 'journal'))
            self.assertTrue(app.messages.empty())
            app.allocations['food'].set.assert_called_once_with(5)
            app.allocations['wood'].set.assert_called_once_with(0)
            self.assertFalse(app.resetting)


if __name__ == '__main__':
    unittest.main()
