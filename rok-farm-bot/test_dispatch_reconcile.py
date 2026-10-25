import unittest,threading
from unittest.mock import Mock,patch
import numpy as np
from bot import App
from farm_cycle import FarmCycle
from vision import Observation
from step_retry import retry_step

class DispatchReconcileTests(unittest.TestCase):
 def app(self):
  app=App.__new__(App);app.stop=threading.Event();app.vision=Mock();app.log=Mock();app.active=Mock(return_value=True)
  app.settings={'probe':False,'armies':5,'interval':1,'resource':'wood'}
  app.cycle=FarmCycle({'food':0,'wood':2,'stone':2,'gold':1});app.cfg={};app.save=Mock()
  app.journal=None;app.current_character=None;app.dispatch_state={'pending':True,'before':1,'authorized':False}
  app.auto_click=Mock();return app
 def observations(self,app,items):
  screen=np.zeros((900,1600,3),np.uint8)
  app.detect=Mock(side_effect=[(o,screen,(0,0)) for o in items])
 def test_missing_map_counter_reconciles_in_queue_without_redispatch(self):
  app=self.app()
  self.observations(app,[Observation(state='outside')]*3+[
   Observation(state='new',queue=2,capacity=5),Observation(state='outside',queue=5,capacity=5)])
  with patch.object(app.stop,'wait',return_value=False),patch('bot.pg.press') as key,patch('bot.CharacterNavigator') as nav:
   self.assertEqual(app.run_auto(one_pass=True),(5,5))
  self.assertEqual(app.cycle.cursor,1);app.auto_click.assert_not_called()
  key.assert_called_once_with('f');nav.return_value.close_to_map.assert_called_once()
  self.assertFalse(app.dispatch_state['pending'])
 def test_queue_unchanged_retries_same_resource_without_advancing(self):
  app=self.app();app.dispatch_state['reconcile']=True
  self.observations(app,[Observation(state='new',queue=1,capacity=5),Observation(state='march')])
  def click(key,state):
   if key=='march':app.stop.set()
   return Observation(state='new',queue=1,capacity=5)
  app.auto_click.side_effect=click
  with patch.object(app.stop,'wait',return_value=False):app.run_auto(one_pass=True)
  self.assertEqual(app.cycle.cursor,0);self.assertTrue(app.dispatch_state['pending'])
  self.assertEqual([c.args[0] for c in app.auto_click.call_args_list],['new_army','march'])
 def test_full_queue_confirms_pending_once(self):
  app=self.app();app.dispatch_state.update(before=4,reconcile=True)
  self.observations(app,[Observation(state='new',queue=5,capacity=5)])
  self.assertEqual(app.run_auto(one_pass=True),(5,5));self.assertEqual(app.cycle.cursor,1)
  app.auto_click.assert_not_called()
 def test_focus_recovery_precedes_action(self):
  app=self.app();app.active.return_value=False
  action=Mock(return_value='done');recover=Mock(return_value=True)
  self.assertEqual(retry_step(app,'farm',action,recover),'done')
  recover.assert_called_once();action.assert_called_once()
