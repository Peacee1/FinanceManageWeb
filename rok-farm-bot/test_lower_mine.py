import unittest,threading
from unittest.mock import Mock,patch
from bot import App
from vision import Observation
class LowerMineTests(unittest.TestCase):
 def app(self,level=8):
  app=App.__new__(App);app.vision=object();app.stop=threading.Event();app.active=lambda:True;app.log=Mock()
  app.settings={'probe':False,'resource':'stone','level':level,'armies':5,'interval':1};return app
 def test_no_response_lowers_one_at_a_time_without_editing_config(self):
  app=self.app();level=[8];finds=[];clicks=[]
  app.detect=lambda:(Observation(state='search',level=level[0]),None,(0,0))
  def click(key,state):
   clicks.append(key)
   if key=='minus':level[0]-=1
   if key=='find':
    finds.append(level[0])
    if len(finds)==3:app.stop.set()
  app.auto_click=click
  with patch('bot.time.monotonic',side_effect=range(0,100,4)),patch.object(app.stop,'wait',side_effect=lambda _:app.stop.is_set()):app.run_auto()
  self.assertEqual(finds,[8,7,6]);self.assertEqual(clicks.count('minus'),2);self.assertEqual(app.settings['level'],8)
 def test_level_one_does_not_decrease_below_minimum(self):
  app=self.app(1);app.detect=lambda:(Observation(state='search',level=1),None,(0,0));clicks=[];finds=[]
  def click(key,state):
   clicks.append(key)
   if key=='find':
    finds.append(app.settings['resource'])
    if len(finds)==2:app.stop.set()
  app.auto_click=click
  with patch('bot.random.choice',return_value='wood') as choose,patch('bot.time.monotonic',side_effect=range(0,100,4)),patch.object(app.stop,'wait',side_effect=lambda _:app.stop.is_set()):app.run_auto()
  self.assertEqual(finds,['stone','wood']);self.assertNotIn('minus',clicks)
  self.assertNotIn('stone',choose.call_args.args[0]);self.assertEqual(app.settings['level'],1)
 def test_retry_preserves_lower_level_for_same_resource(self):
  app=self.app();app.dispatch_state={'search_resource':'stone','search_level':7}
  levels=[8];app.detect=lambda:(Observation(state='search',level=levels[0]),None,(0,0))
  def click(key,state):
   if key=='minus':levels[0]-=1
   if key=='find':self.assertEqual(levels[0],7);app.stop.set()
  app.auto_click=click
  with patch.object(app.stop,'wait',side_effect=lambda _:app.stop.is_set()):app.run_auto()
