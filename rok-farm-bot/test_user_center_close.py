import unittest
from types import SimpleNamespace
from unittest.mock import Mock
import numpy as np
from characters import CharacterNavigator

class UserCenterCloseTests(unittest.TestCase):
 def test_close_is_anchored_to_panel_and_title(self):
  nav=CharacterNavigator(SimpleNamespace(vision=Mock(),log=Mock()));nav.click=Mock()
  screen=np.zeros((900,1600,3),np.uint8);screen[200:700,600:1000]=245
  nav.close_user_center(screen,(100,50),[('trungtamnguoidung',(800,230),'Trung Tâm Người Dùng')])
  nav.click.assert_called_once_with((976,235),(100,50))
 def test_no_panel_does_not_guess_close_position(self):
  nav=CharacterNavigator(SimpleNamespace(vision=Mock(),log=Mock()));nav.click=Mock()
  with self.assertRaises(RuntimeError):nav.close_user_center(np.zeros((900,1600,3),np.uint8),(0,0),[])
  nav.click.assert_not_called()
