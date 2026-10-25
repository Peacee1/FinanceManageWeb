import unittest,json,sys,threading
from pathlib import Path
from unittest.mock import patch,Mock
from types import SimpleNamespace
import cv2,numpy as np
from vision import Vision
from characters import CharacterNavigator,extract_stars

class LDRecordedTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  with patch.object(sys,'argv',['test','--ldplayer']):cls.v=Vision('assets')
 def frame(self,name):
  p=Path('ldplayer-captures')/name
  return cv2.imdecode(np.fromfile(p.with_suffix('.png'),dtype=np.uint8),1)[35:935,:1600],json.loads(p.with_suffix('.json').read_text('utf-8'))
 def test_farm_screens(self):
  for name,state in [('inside','inside'),('outside','outside'),('search-wood','search'),('deposit','deposit'),('queue','new'),('march','march'),('dispatched','outside')]:
   s,rows=self.frame(name);o=self.v.from_rows(s,rows)
   self.assertEqual(o.state,state,name)
   if name=='search-wood':
    self.assertEqual(o.level,1)
    for key,x in [('food',559),('wood',798),('stone',1039),('gold',1279)]:self.assertLess(abs(o.buttons[key][0]-x),5)
    self.assertLess(abs(o.buttons['plus'][0]-978),5)
   if name=='deposit':self.assertTrue(o.free)
   if name=='queue':self.assertEqual((o.queue,o.capacity),(0,5))
   if name=='dispatched':self.assertEqual((o.queue,o.capacity),(1,5))
 def test_active_governor_and_power(self):
  s,rows=self.frame('characters');nav=CharacterNavigator(SimpleNamespace(vision=self.v))
  nav.inspect=Mock(return_value=('characters',s,(0,0),rows,[]))
  chars=nav.page()[0];self.assertEqual(len(chars),6)
  self.assertEqual([c.name for c in chars if c.active],['Peacee1XF10'])
  self.assertEqual(chars[0].power,14324875)
 def test_bottom_roster_boundary(self):
  s,rows=self.frame('characters-bottom');chars,normal,stars=extract_stars(rows,s.shape,True)
  self.assertTrue(normal);self.assertEqual(len(chars),4)
 def test_profile_and_confirm(self):
  for name,state in [('profile','profile'),('settings','settings'),('confirm-character','confirm_character'),('alliance','alliance'),('territory','territory')]:
   s,rows=self.frame(name)
   app=SimpleNamespace(vision=self.v,stop=threading.Event(),active=lambda:True,snapshot=lambda:(s,(0,0)),log=Mock())
   nav=CharacterNavigator(app)
   with patch.object(self.v,'engine',Mock(return_value=(rows,None))):self.assertEqual(nav.inspect()[0],state)
 def test_no_start_prompt_in_alliance(self):
  s,rows=self.frame('alliance');self.assertNotEqual(self.v.from_rows(s,rows).state,'start_screen')

 def test_resized_search_and_governors(self):
  for scale in (.7,1.2):
   for name in ('search-wood','characters'):
    s,rows=self.frame(name);s=cv2.resize(s,None,fx=scale,fy=scale)
    rows=[[(np.array(b)*scale).tolist(),t,c] for b,t,c in rows]
    if name=='search-wood':
     o=self.v.from_rows(s,rows);self.assertEqual((o.state,o.level),('search',1))
     for key,x in [('food',559),('wood',798),('stone',1039),('gold',1279)]:self.assertLess(abs(o.buttons[key][0]-x*scale),6)
    else:
     nav=CharacterNavigator(SimpleNamespace(vision=self.v));nav.inspect=Mock(return_value=('characters',s,(0,0),rows,[]))
     self.assertEqual([c.name for c in nav.page()[0] if c.active],['Peacee1XF10'])

 def test_loading_never_matches_map_icons(self):
  s=cv2.imdecode(np.fromfile('ldplayer-captures/navigation-failure.png',dtype=np.uint8),1)
  b=[[700,790],[900,790],[900,820],[700,820]]
  with patch.object(self.v,'icon',return_value=(.8,(60,820))):
   self.assertEqual(self.v.from_rows(s,[[b,'Đang tải 16%',.95]]).state,'loading')
   self.assertIsNone(self.v.from_rows(s,[]).state)
