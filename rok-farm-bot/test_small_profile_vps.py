import unittest,threading
from types import SimpleNamespace
from unittest.mock import Mock
import cv2
from vision import Vision
from characters import CharacterNavigator,Character
class SmallProfileTests(unittest.TestCase):
 def test_actual_vps_profile_is_not_map_and_opens_settings(self):
  im=cv2.imread('live-fixtures/f2-profile-vps.jpg');v=Vision('assets');rows,_=v.engine(im)
  app=SimpleNamespace(vision=v,stop=threading.Event(),active=lambda:True,snapshot=lambda:(im,(0,0)),log=Mock())
  n=CharacterNavigator(app);state=n.inspect()[0];self.assertEqual(state,'profile')
  self.assertTrue(n.profile_matches(Character('2985:betif2','Bé Ti F2','2985',(0,0))))
  self.assertFalse(n.profile_matches(Character('2985:betif3','Bé Ti F3','2985',(0,0))))

 def test_missing_counter_and_labels_still_recognizes_panel_and_gear(self):
  im=cv2.imread('live-fixtures/f2-profile-vps.jpg');v=Vision('assets');rows,_=v.engine(im)
  rows=[r for r in rows if '/' not in r[1]]
  v.engine=Mock(return_value=(rows,None))
  app=SimpleNamespace(vision=v,stop=threading.Event(),active=lambda:True,snapshot=lambda:(im,(0,0)),log=Mock())
  self.assertEqual(CharacterNavigator(app).inspect()[0],'profile')
