import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
import cv2
import numpy as np
from vision import Vision,other_device_dialog,network_dialog
from launcher_recovery import is_rok_launcher,launcher_start_point,recover_launcher_game,verify_resumed_governor

class LauncherRecoveryTests(unittest.TestCase):
 def test_supplied_dialog_and_launcher_images_are_recognized(self):
  root=Path(__file__).parent;vision=Vision(root/'assets')
  screen=cv2.imread(str(root/'live-fixtures/other-device-login.png'));rows,_=vision.engine(screen)
  dialog=other_device_dialog(screen,rows)
  self.assertEqual(dialog.state,'other_device_login')
  self.assertLess(abs(dialog.buttons['reconnect'][0]-391),10)
  self.assertLess(abs(dialog.buttons['reconnect'][1]-294),10)
  self.assertIsNone(network_dialog(screen,rows))
  self.assertEqual(vision.from_rows(screen,rows).state,'other_device_login')
  screen=cv2.imread(str(root/'live-fixtures/rok-launcher.png'));rows,_=vision.engine(screen)
  point=launcher_start_point(screen,rows)
  self.assertIsNotNone(point);self.assertLess(abs(point[0]-1169),12);self.assertLess(abs(point[1]-611),12)
 def test_launcher_identity_excludes_unrelated_launcher(self):
  self.assertTrue(is_rok_launcher(r'D:\Rise of Kingdoms\ROK\ROKLauncher\launcher.exe','Launcher'))
  self.assertFalse(is_rok_launcher(r'C:\OtherGame\launcher.exe','Launcher'))
  self.assertFalse(is_rok_launcher(r'C:\ROKLauncher\browser.exe','Launcher'))
 def app(self):
  return SimpleNamespace(stop=Mock(is_set=Mock(return_value=False),wait=Mock(return_value=False)),
   log=Mock(),vision=SimpleNamespace(engine=Mock(return_value=([],None))),
   _launcher_recovery={'original':(1,10),'phase':'closing','since':0})
 def test_restart_waits_for_old_game_close_and_only_clicks_start_once(self):
  app=self.app();old=Mock(hwnd=1);new=Mock(hwnd=2);new.active.return_value=True
  launcher=Mock();launcher.active.return_value=True
  launcher.capture.return_value=(np.zeros((720,1280,3),np.uint8),(30,40))
  with patch('launcher_recovery.time.monotonic',return_value=10),patch('launcher_recovery.GameWindow.find',side_effect=[old,RuntimeError('closed'),RuntimeError('starting'),new]),patch('launcher_recovery.LauncherWindow.find',return_value=launcher) as find_launcher,patch('launcher_recovery.window_identity',side_effect=lambda w:(w.hwnd,w.hwnd*10)),patch('launcher_recovery.launcher_start_point',return_value=(1100,600)),patch('launcher_recovery.pg.moveTo') as move,patch('launcher_recovery.pg.mouseDown') as down,patch('launcher_recovery.pg.mouseUp') as up:
   self.assertTrue(recover_launcher_game(app))
  find_launcher.assert_called_once();down.assert_called_once();up.assert_called_once()
  move.assert_called_once_with(1130,640,duration=.15)
  self.assertIs(app.game,new);self.assertIsNone(app._launcher_recovery)
 def test_unknown_start_button_does_not_click_and_preserves_pending_step(self):
  app=self.app();app._launcher_recovery['phase']='launcher'
  launcher=Mock();launcher.capture.return_value=(np.zeros((720,1280,3),np.uint8),(0,0))
  with patch('launcher_recovery.GameWindow.find',side_effect=RuntimeError('missing')),patch('launcher_recovery.LauncherWindow.find',return_value=launcher),patch('launcher_recovery.launcher_start_point',return_value=None),patch('launcher_recovery.pg.mouseDown') as down:
   with self.assertRaises(RuntimeError):recover_launcher_game(app)
  down.assert_not_called();self.assertEqual(app._launcher_recovery['phase'],'launcher')
 def test_stop_prevents_relaunch(self):
  app=self.app();app.stop.is_set.return_value=True
  with patch('launcher_recovery.LauncherWindow.find') as launcher:
   with self.assertRaises(RuntimeError):recover_launcher_game(app)
  launcher.assert_not_called()
 def test_game_already_reopened_does_not_click_launcher(self):
  app=self.app();game=Mock();game.active.return_value=True
  with patch('launcher_recovery.GameWindow.find',return_value=game),patch('launcher_recovery.window_identity',return_value=(2,20)),patch('launcher_recovery.LauncherWindow.find') as launcher:
   self.assertTrue(recover_launcher_game(app))
  launcher.assert_not_called()
 def test_governor_verification_is_kept_pending_after_failure(self):
  app=self.app();target={'id':'2771:f3','name':'F3','kingdom':'2771'}
  app._post_launcher_governor=target
  nav=Mock();nav.select.side_effect=[RuntimeError('not ready'),None]
  with patch('characters.CharacterNavigator',return_value=nav):
   with self.assertRaises(RuntimeError):verify_resumed_governor(app)
   self.assertIs(app._post_launcher_governor,target)
   self.assertFalse(app._verifying_launcher_governor)
   verify_resumed_governor(app)
  self.assertIsNone(app._post_launcher_governor)
  self.assertEqual(nav.select.call_count,2)
