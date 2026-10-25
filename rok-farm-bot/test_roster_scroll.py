import threading,unittest
from types import SimpleNamespace
from unittest.mock import Mock,patch
import numpy as np
from characters import CharacterNavigator

class AndroidRosterScrollTests(unittest.TestCase):
 def nav(self,mobile=True):
  app=SimpleNamespace(stop=threading.Event(),active=Mock(return_value=True),vision=SimpleNamespace(mobile=mobile),log=Mock())
  nav=CharacterNavigator(app);nav.pause=Mock();return nav
 def test_mobile_drag_stays_inside_roster_and_keeps_overlap(self):
  nav=self.nav();screen=np.zeros((900,1600,3),np.uint8)
  with patch('characters.pg.moveTo') as move,patch('characters.pg.dragTo') as drag,patch('characters.pg.mouseUp') as up,patch('characters.pg.scroll') as wheel:
   nav.scroll_page(screen,(20,40))
  self.assertEqual(move.call_args.args,(724,733));self.assertEqual(drag.call_args.args,(724,463))
  self.assertEqual(drag.call_args.kwargs,{'duration':.65,'button':'left'})
  up.assert_called_once();wheel.assert_not_called()
 def test_unchanged_list_changes_lane_and_drag_distance(self):
  nav=self.nav();screen=np.zeros((900,1600,3),np.uint8)
  with patch('characters.pg.moveTo'),patch('characters.pg.dragTo') as drag,patch('characters.pg.mouseUp'):
   nav.scroll_page(screen,(0,0));nav.scroll_page(screen,(0,0))
   self.assertEqual(drag.call_args.args,(1184,306));self.assertEqual(drag.call_args.kwargs['duration'],.9)
   nav.scroll_page(np.full_like(screen,80),(0,0))
   self.assertEqual(drag.call_args.kwargs['duration'],.65)
  self.assertEqual(nav.scroll_stalls,0)
 def test_drag_error_releases_mouse(self):
  nav=self.nav()
  with patch('characters.pg.moveTo'),patch('characters.pg.dragTo',side_effect=RuntimeError('drag failed')),patch('characters.pg.mouseUp') as up:
   with self.assertRaises(RuntimeError):nav.scroll_page(np.zeros((900,1600,3),np.uint8),(0,0))
  up.assert_called_once()
 def test_pc_keeps_wheel_scroll(self):
  nav=self.nav(False)
  with patch('characters.pg.moveTo'),patch('characters.pg.scroll') as wheel,patch('characters.pg.dragTo') as drag:
   nav.scroll_page(np.zeros((900,1600,3),np.uint8),(0,0))
  wheel.assert_called_once_with(-4);drag.assert_not_called()
