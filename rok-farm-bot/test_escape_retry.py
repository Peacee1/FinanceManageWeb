import unittest,threading
from types import SimpleNamespace
from unittest.mock import Mock,patch
from step_retry import retry_step,escape_and_observe

class EscapeRetryTests(unittest.TestCase):
 def app(self):return SimpleNamespace(stop=threading.Event(),active=Mock(return_value=True),log=Mock())
 def test_escape_every_five_failures_and_keep_same_action(self):
  app=self.app();action=Mock(side_effect=[RuntimeError('blocked')]*11+['done'])
  with patch.object(app.stop,'wait',return_value=False),patch('step_retry.escape_and_observe') as recovery:
   self.assertEqual(retry_step(app,'farm F7',action),'done')
  self.assertEqual(action.call_count,12);self.assertEqual(recovery.call_count,2)
 def test_success_before_five_never_sends_escape(self):
  app=self.app()
  with patch.object(app.stop,'wait',return_value=False),patch('step_retry.escape_and_observe') as recovery:
   self.assertEqual(retry_step(app,'farm',Mock(side_effect=[RuntimeError('blocked')]*4+['done'])),'done')
  recovery.assert_not_called()
 def test_escape_observes_fresh_screen_once(self):
  app=self.app()
  with patch.object(app.stop,'wait',return_value=False),patch('pyautogui.press') as key,patch('characters.CharacterNavigator') as nav:
   nav.return_value.inspect.return_value=('outside',None,None,None,None)
   escape_and_observe(app,'farm')
  key.assert_called_once_with('esc');nav.return_value.inspect.assert_called_once()
 def test_inactive_or_stopped_game_never_receives_escape(self):
  app=self.app();app.active.return_value=False
  with patch('pyautogui.press') as key:
   escape_and_observe(app,'farm');app.stop.set();escape_and_observe(app,'farm')
  key.assert_not_called()
 def test_failed_recovery_keeps_retrying_same_step(self):
  app=self.app()
  with patch.object(app.stop,'wait',return_value=False),patch('step_retry.escape_and_observe',side_effect=RuntimeError('OCR failed')):
   self.assertEqual(retry_step(app,'farm',Mock(side_effect=[RuntimeError('blocked')]*5+['done'])),'done')
