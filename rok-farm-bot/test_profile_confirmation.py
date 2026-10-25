import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
import cv2
from characters import CharacterNavigator, Character, profile_name
from vision import Vision

class ProfileConfirmationTests(unittest.TestCase):
    def test_start_screen_resumes_loading_before_profile_verification(self):
        import numpy as np
        image=np.zeros((718,958,3),np.uint8)
        rows=[([[25,190],[95,190],[95,205],[25,205]],'Thong doc',.99),
              ([[25,212],[120,212],[120,227],[25,227]],'Peacee1X F9',.99)]
        for state in ('start_screen','loading','exit_dialog'):
            with self.subTest(state=state):
                nav=CharacterNavigator(SimpleNamespace(vision=SimpleNamespace(mobile=False),log=Mock()))
                nav.inspect=Mock(side_effect=[(state,image,(0,0),[],[]),('outside',image,(0,0),[],[])])
                nav.wait_loaded_map=Mock();nav.click=Mock()
                nav.wait_for_panel=Mock(return_value=('profile',image,(0,0),rows,[]))
                self.assertTrue(nav.profile_matches(Character('2771:peacee1f9','Peacee1X F9','2771',(1,1))))
                nav.wait_loaded_map.assert_called_once();nav.click.assert_called_once()
    def test_wrong_governor_is_not_accepted_after_loading(self):
        import numpy as np
        image=np.zeros((718,958,3),np.uint8)
        rows=[([[25,190],[95,190],[95,205],[25,205]],'Thong doc',.99),
              ([[25,212],[120,212],[120,227],[25,227]],'Peacee1X F10',.99)]
        nav=CharacterNavigator(SimpleNamespace(vision=SimpleNamespace(mobile=False),log=Mock()))
        nav.inspect=Mock(return_value=('profile',image,(0,0),rows,[]))
        self.assertFalse(nav.profile_matches(Character('2771:peacee1f9','Peacee1X F9','2771',(1,1))))
    def test_real_profiles_without_orientation_classifier(self):
        vision=Vision(Path(__file__).parent/'assets')
        for file,mobile,expected in [('resized-profile.png',False,'Peacee1XF9'),('ldplayer-captures/profile.png',True,'Peacee1XF10')]:
            with self.subTest(file=file):
                image=cv2.imread(str(Path(__file__).parent/file))
                rows,_=vision.engine(image)
                from characters import same_name
                self.assertTrue(same_name(profile_name(rows,image.shape,mobile) or '',expected))
    def test_matching_profile_never_opens_roster(self):
        app=SimpleNamespace(vision=None)
        nav=CharacterNavigator(app)
        nav.profile_matches=Mock(return_value=True)
        nav.close_to_map=Mock();nav.find=Mock(side_effect=AssertionError('unnecessary roster'))
        nav._select(Character('2771:peacee1f9','Peacee1X F9','2771',(1,1)))
        nav.find.assert_not_called();nav.close_to_map.assert_called_once()
    def test_background_name_without_governor_anchor_is_rejected(self):
        self.assertIsNone(profile_name([([[1,20],[100,20],[100,40],[1,40]],'Peacee1X F9',.99)],(718,958,3)))
