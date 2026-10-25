import unittest,threading,time
from types import SimpleNamespace
from unittest.mock import Mock
import cv2
from vision import Vision
from characters import CharacterNavigator,Character
class ActiveF2Tests(unittest.TestCase):
 def test_actual_f2_tick_and_no_character_switch(self):
  image=cv2.imread('live-fixtures/f2-active-roster.png');v=Vision('assets');rows,_=v.engine(image)
  app=SimpleNamespace(vision=v,stop=threading.Event(),active=lambda:True,log=Mock())
  nav=CharacterNavigator(app);nav.inspect=Mock(return_value=('characters',image,(0,0),rows,[]))
  chars=nav.page()[0];self.assertEqual(len(chars),1);self.assertTrue(chars[0].active)
  nav.profile_matches=Mock(return_value=False);nav.open_list=Mock();nav.close_to_map=Mock();nav.click=Mock()
  nav._select(Character('2985:betif2','Bé Ti F2','2985',(0,0)))
  nav.click.assert_not_called();nav.close_to_map.assert_called_once()
 def test_expired_deadline_still_attempts_focus_recovery(self):
  app=SimpleNamespace(vision=None,stop=threading.Event(),active=lambda:False)
  nav=CharacterNavigator(app);nav.transition_deadline=time.monotonic()-10;nav.recover_loading_window=Mock(return_value=True)
  nav.guard();nav.recover_loading_window.assert_called_once()
