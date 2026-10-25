import unittest
from unittest.mock import patch
from game_window import GameWindow
class FocusTests(unittest.TestCase):
 def test_focus_detaches_input_queue_when_activation_fails(self):
  window=GameWindow(1)
  with patch.object(window,'active',return_value=False),patch('game_window.user32.IsIconic',return_value=False),patch('game_window.user32.GetForegroundWindow',return_value=2),patch('game_window.ctypes.windll.kernel32.GetCurrentThreadId',return_value=10),patch('game_window.user32.GetWindowThreadProcessId',return_value=20),patch('game_window.user32.AttachThreadInput',return_value=True) as attach,patch('game_window.user32.SetForegroundWindow'),patch('game_window.user32.BringWindowToTop'),patch('game_window.user32.SetFocus',side_effect=RuntimeError('failed')):
   with self.assertRaises(RuntimeError):window.focus()
   self.assertEqual(attach.call_args_list[0].args,(10,20,True))
   self.assertEqual(attach.call_args_list[-1].args,(10,20,False))
 def test_normal_focus_does_not_attach_threads(self):
  window=GameWindow(1)
  with patch.object(window,'active',return_value=True),patch('game_window.user32.IsIconic',return_value=False),patch('game_window.user32.SetForegroundWindow'),patch('game_window.user32.AttachThreadInput') as attach:
   self.assertTrue(window.focus());attach.assert_not_called()
 def test_login_popup_same_process_is_active(self):
  def pid(hwnd,out):out._obj.value=100 if hwnd in (1,2) else 200
  with patch('game_window.user32.GetWindow',return_value=0),patch('game_window.user32.GetForegroundWindow',return_value=2),patch('game_window.user32.GetWindowThreadProcessId',side_effect=pid):self.assertTrue(GameWindow(1).active())
 def test_other_application_is_not_active(self):
  def pid(hwnd,out):out._obj.value=hwnd
  with patch('game_window.user32.GetWindow',return_value=0),patch('game_window.user32.GetForegroundWindow',return_value=3),patch('game_window.user32.GetWindowThreadProcessId',side_effect=pid):self.assertFalse(GameWindow(1).active())
if __name__=='__main__':unittest.main()
