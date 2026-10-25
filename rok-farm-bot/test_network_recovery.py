import unittest,threading
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
import cv2
from vision import Vision,Observation,network_dialog
from network_recovery import reconnect_game

class NetworkRecoveryTests(unittest.TestCase):
 def test_actual_network_dialog_image_detects_confirm(self):
  root=Path(__file__).parent
  screen=cv2.imread(str(root/'live-fixtures/network-disconnected.png'))
  vision=Vision(root/'assets')
  rows,_=vision.engine(screen)
  found=network_dialog(screen,rows or [])
  self.assertEqual(found.state,'network_disconnected')
  self.assertLess(abs(found.buttons['reconnect'][0]-377),8)
  self.assertLess(abs(found.buttons['reconnect'][1]-275),8)
  self.assertEqual(vision.from_rows(screen,rows or []).state,'network_disconnected')
 def test_generic_confirm_button_is_not_network_reconnect(self):
  screen=cv2.imread(str(Path(__file__).parent/'live-fixtures/network-disconnected.png'))
  row=[[[328,262],[426,262],[426,288],[328,288]],'Xác nhận',.99]
  self.assertIsNone(network_dialog(screen,[row]))
 def app(self):
  return SimpleNamespace(stop=Mock(is_set=Mock(return_value=False),wait=Mock(return_value=False)),active=Mock(return_value=True),log=Mock(),_recent_detection='stale')
 def test_reconnect_uses_offset_and_separate_press_release(self):
  app=self.app();obs=Observation(state='network_disconnected',buttons={'reconnect':(377,275)})
  with patch('network_recovery.pg.moveTo') as move,patch('network_recovery.pg.mouseDown') as down,patch('network_recovery.pg.mouseUp') as up:
   reconnect_game(app,obs,(10,30))
  move.assert_called_once_with(387,305,duration=.15);down.assert_called_once();up.assert_called_once()
  self.assertIsNone(app._recent_detection);app.stop.wait.assert_any_call(3)
 def test_unknown_confirm_or_lost_focus_never_clicks(self):
  app=self.app()
  with patch('network_recovery.pg.mouseDown') as down:
   with self.assertRaises(RuntimeError):reconnect_game(app,Observation(state='network_disconnected'),(0,0))
   app.active.return_value=False
   with self.assertRaises(RuntimeError):reconnect_game(app,Observation(buttons={'reconnect':(1,1)}),(0,0))
  down.assert_not_called()
 def test_stop_during_press_still_releases_button(self):
  app=self.app();app.stop.wait.return_value=True
  with patch('network_recovery.pg.moveTo'),patch('network_recovery.pg.mouseDown'),patch('network_recovery.pg.mouseUp') as up:
   with self.assertRaises(RuntimeError):reconnect_game(app,Observation(buttons={'reconnect':(1,1)}),(0,0))
  up.assert_called_once()
