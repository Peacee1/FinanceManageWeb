import unittest,threading
from types import SimpleNamespace
from unittest.mock import Mock,patch
from input_diagnostics import InputDiagnostics

class InputDiagnosticTests(unittest.TestCase):
 def monitor(self):return InputDiagnostics(SimpleNamespace(worker=Mock(is_alive=Mock(return_value=True)),stop=threading.Event(),active=Mock(return_value=True),log=Mock()))
 def test_mouse_failure_to_reach_target_prevents_click(self):
  monitor=self.monitor();monitor.originals={'moveTo':Mock()};click=Mock()
  with patch('input_diagnostics.pg.position',return_value=(0,0)):
   with self.assertRaisesRegex(RuntimeError,'Không điều khiển'):monitor.wrap('click',click)(200,300)
  click.assert_not_called();self.assertIn('Lỗi điều khiển click',str(monitor.app.log.call_args))
 def test_keyboard_failure_logs_no_input_or_exception_secret(self):
  monitor=self.monitor();send=Mock(side_effect=RuntimeError('private-password'))
  with self.assertRaises(RuntimeError):monitor.wrap('hotkey',send)('private-password')
  self.assertNotIn('private-password',str(monitor.app.log.call_args_list))
 def test_focus_loss_does_not_send_mouse_event(self):
  monitor=self.monitor();monitor.app.active.return_value=False;send=Mock()
  with self.assertRaises(RuntimeError):monitor.wrap('click',send)(200,300)
  send.assert_not_called()
 def test_successful_click_logs_requested_coordinates_without_claiming_game_response(self):
  monitor=self.monitor();monitor.originals={'moveTo':Mock()};send=Mock()
  with patch('input_diagnostics.pg.position',return_value=(200,300)):monitor.wrap('click',send)(200,300)
  send.assert_called_once_with(200,300);self.assertIn('chưa coi là game',str(monitor.app.log.call_args))
