import unittest,threading,sys
from unittest.mock import Mock,patch
from types import SimpleNamespace
import cv2,numpy as np
from vision import Vision
from characters import CharacterNavigator

class AllianceOptionalTests(unittest.TestCase):
 def nav(self):
  app=SimpleNamespace(vision=SimpleNamespace(mobile=True),stop=threading.Event(),active=Mock(return_value=True),log=Mock())
  nav=CharacterNavigator(app);nav.claim_alliance=Mock();nav.close_to_map=Mock();return nav
 def test_ocr_failure_recovers_map_and_continues(self):
  nav=self.nav();nav.claim_alliance.side_effect=RuntimeError('flag missing')
  self.assertFalse(nav.claim_alliance_optional());nav.close_to_map.assert_called_once()
 def test_stop_does_not_continue(self):
  nav=self.nav();nav.app.stop.set();nav.claim_alliance.side_effect=RuntimeError('stopped')
  with self.assertRaises(RuntimeError):nav.claim_alliance_optional()
  nav.close_to_map.assert_not_called()
 def test_focus_loss_does_not_continue(self):
  nav=self.nav();nav.app.active.return_value=False;nav.claim_alliance.side_effect=RuntimeError('focus')
  with self.assertRaises(RuntimeError):nav.claim_alliance_optional()
  nav.close_to_map.assert_not_called()
 def test_failed_recovery_still_retries_outside_claim(self):
  import pyautogui as pg
  nav=self.nav();nav.claim_alliance.side_effect=pg.FailSafeException();nav.close_to_map.side_effect=pg.FailSafeException()
  with self.assertRaises(pg.FailSafeException):nav.claim_alliance_optional()
  nav.close_to_map.assert_called_once()
 def test_i_sent_once_only_when_collapsed(self):
  nav=self.nav();nav.key=Mock();nav.pause=Mock();nav.inspect=Mock(return_value=('inside',None,None,None,[]))
  nav.alliance_menu_visible=Mock(side_effect=[False,False,True]);nav.ensure_alliance_menu();nav.key.assert_called_once_with('i')
 def test_expanded_menu_does_not_toggle_closed(self):
  nav=self.nav();nav.key=Mock();nav.inspect=Mock(return_value=('inside',None,None,None,[]))
  nav.alliance_menu_visible=Mock(return_value=True);nav.ensure_alliance_menu();nav.key.assert_not_called()
 def test_real_menu_images(self):
  with patch.object(sys,'argv',['test','--ldplayer']):v=Vision('assets')
  nav=CharacterNavigator(SimpleNamespace(vision=v))
  for name,expected in [('inside',True),('menu-collapsed',False)]:
   s=cv2.imdecode(np.fromfile('ldplayer-captures/'+name+'.png',dtype=np.uint8),1)[35:935,:1600]
   self.assertEqual(nav.alliance_menu_visible(s,[]),expected,name)
