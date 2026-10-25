import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from round_state import RoundState


class RoundProgressTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.path = Path(self.folder.name) / 'progress.json'
        self.clock = [100]
        self.state = RoundState(self.path, 'same-plan', lambda: self.clock[0])
        self.state.roster([SimpleNamespace(identity='A', name='A', kingdom='2771'),
                           SimpleNamespace(identity='B', name='B', kingdom='2771')])

    def tearDown(self):
        self.folder.cleanup()

    def test_resume_does_not_repeat_completed_character(self):
        self.state.finish('A', 5, 7)
        loaded = RoundState(self.path, 'same-plan', lambda: 200)
        self.assertEqual([c['identity'] for c in loaded.pending()], ['B'])

    def test_error_does_not_mean_completed(self):
        self.state.fail('A', 'OCR failed')
        self.assertFalse(self.state.completed('A'))
        self.assertEqual(len(self.state.pending()), 2)

    def test_schedule_only_after_all_done(self):
        self.state.finish('A', 5, 7)
        with self.assertRaises(ValueError):
            self.state.schedule(2)
        self.clock[0] = 200
        self.state.finish('B', 4, 4)
        self.assertEqual(self.state.schedule(2), 7400)
        loaded = RoundState(self.path, 'same-plan', lambda: 3000)
        self.assertEqual(loaded.schedule(2), 7400)

    def test_new_round_resets_completion(self):
        self.state.finish('A', 5, 7)
        previous = self.state.data['round']
        self.state.new_round()
        self.assertNotEqual(self.state.data['round'], previous)
        self.assertFalse(self.state.completed('A'))

    def test_changed_plan_starts_new_round(self):
        self.state.finish('A', 5, 7)
        changed = RoundState(self.path, 'changed-plan', lambda: 200)
        self.assertFalse(changed.completed('A'))

    def test_bad_journal_is_not_silently_reset(self):
        self.path.write_text('not json', 'utf-8')
        with self.assertRaises(ValueError):
            RoundState(self.path, 'same-plan')


if __name__ == '__main__':
    unittest.main()
