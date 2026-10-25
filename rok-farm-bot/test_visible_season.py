import json,threading,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
import cv2
from characters import CharacterNavigator,Character,extract_stars

class VisibleSeasonGovernorTests(unittest.TestCase):
 def nav(self):
  app=SimpleNamespace(stop=threading.Event(),vision=SimpleNamespace(mobile=True),log=Mock())
  nav=CharacterNavigator(app);nav.open_list=Mock();nav.scroll_page=Mock(side_effect=AssertionError('visible governor must not scroll'))
  return nav
 def test_real_f3_roster_matches_home_id_without_scrolling(self):
  screen=cv2.imread('ldplayer-captures/f3-season-roster.png')
  rows=json.loads(Path('ldplayer-captures/f3-season-roster.json').read_text('utf8'))
  chars,normal,stars=extract_stars(rows,screen.shape)
  self.assertEqual(len(chars),5)
  nav=self.nav();nav.page=Mock(return_value=(chars,normal,stars,screen,(0,0)))
  found,_,_=nav.find('2771:peacee1f3')
  self.assertEqual(found.identity,'C13304:peacee1f3')
  self.assertEqual(found.point,next(c.point for c in chars if c.kingdom=='C13304'))
  nav.scroll_page.assert_not_called();nav.page.assert_called_once()
 def test_return_from_season_to_home_does_not_scroll(self):
  nav=self.nav();nav.page=Mock(return_value=([Character('2771:peacee1f3','Peacee1X F3','2771',(600,600))],False,True,None,(0,0)))
  self.assertEqual(nav.find('C13304:peacee1f3')[0].kingdom,'2771')
  nav.scroll_page.assert_not_called()
 def test_visible_other_number_is_not_selected(self):
  nav=self.nav();nav.page=Mock(return_value=([Character('C13304:peacee1f2','Peacee1X F2','C13304',(600,600))],True,True,None,(0,0)))
  with self.assertRaisesRegex(RuntimeError,'Không tìm thấy'):nav.find('2771:peacee1f3')
 def test_duplicate_visible_name_cannot_resolve_by_season(self):
  nav=self.nav();nav.page=Mock(return_value=([
   Character('C13304:peacee1f3','Peacee1X F3','C13304',(600,600)),
   Character('C13305:peacee1f3','Peacee1X F3','C13305',(1100,600))],True,True,None,(0,0)))
  with self.assertRaisesRegex(RuntimeError,'Không tìm thấy'):nav.find('2771:peacee1f3')
