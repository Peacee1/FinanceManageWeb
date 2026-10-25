import unittest,threading,time,tempfile
from unittest.mock import Mock,patch
from types import SimpleNamespace
from fleet_client import FleetClient

class FleetConnectionTests(unittest.TestCase):
 def test_one_governor_error_does_not_block_following_governor(self):
  app=SimpleNamespace(stop=threading.Event(),vision=object(),active=Mock(return_value=True),log=Mock())
  c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.');c.report=Mock();c.farm_one=Mock(side_effect=[RuntimeError('OCR name mismatch'),None,None])
  task={'id':'1','lease_id':'lease','governors':[{'id':'F10','name':'F10','enabled':True},{'id':'F11','name':'F11','enabled':True}]}
  with patch('characters.CharacterNavigator'),patch('fleet_client.GameWindow.find',return_value=Mock()):
   c.farm_governors(task)
  self.assertEqual(c.farm_one.call_count,3)
  c.report.assert_called_once_with(task,'farm_error',governor_id='F10')
 def test_only_expected_https_server_is_accepted(self):
  app=SimpleNamespace(stop=threading.Event())
  for url in ('http://rokbot.peacee1.io.vn','https://untrusted.example','https://user@rokbot.peacee1.io.vn'):
   with self.assertRaises(ValueError):FleetClient(app,{'server':url,'token':'x','botId':'y'},'.')
 def test_remote_stop_stops_local_actions(self):
  app=SimpleNamespace(stop=threading.Event());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.')
  def request(*args):c.closed.set();return {'desired':'stop','tasks':[]}
  c.request=request;c.heartbeat();self.assertTrue(app.stop.is_set())
 def test_lost_assignment_stops_current_account(self):
  app=SimpleNamespace(stop=threading.Event());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.');c.current=1
  def request(*args):c.closed.set();return {'desired':'run','tasks':[]}
  c.request=request;c.heartbeat();self.assertTrue(app.stop.is_set())
 def test_stale_connection_stops_actions(self):
  app=SimpleNamespace(stop=threading.Event());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.');c.last_ok=time.monotonic()-60
  def request(*args):c.closed.set();raise OSError('network down')
  c.request=request;c.heartbeat();self.assertTrue(app.stop.is_set())
 def test_discovery_reports_roster_without_running_farm(self):
  app=SimpleNamespace(stop=threading.Event(),vision=object(),log=Mock(),run_all_characters=Mock())
  with tempfile.TemporaryDirectory() as root:
   c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},root)
   c.desired='run';c.last_ok=time.monotonic();c.tasks=[{'id':'1','email':'test@example.com','credential':{'password':'test'},'config':{'allocations':{'food':1},'level':8},'lease_id':'lease'}]
   task=c.tasks[0]
   c.heartbeat=Mock()
   def report(*args):c.closed.set();return {'accepted':True}
   c.report=Mock(side_effect=report)
   with patch('fleet_client.GameWindow.find',return_value=Mock()),patch('fleet_client.AccountLogin') as login,patch('characters.CharacterNavigator') as nav:
    nav.return_value.scan.return_value=[SimpleNamespace(identity='2771:F1',name='F1',kingdom='2771',power=12345)]
    c.run()
    login.return_value.login.assert_called_once()
    c.report.assert_called_once_with(task,'ready',[{'id':'2771:F1','name':'F1','kingdom':'2771','power':12345}])
    app.run_all_characters.assert_not_called()
    self.assertIn('lease',c.completed_leases)
    self.assertEqual(c.tasks,[])
 def test_heartbeat_does_not_restore_completed_lease(self):
  app=SimpleNamespace(stop=threading.Event());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.')
  c.completed_leases.add('done')
  def request(*args):c.closed.set();return {'desired':'run','tasks':[{'id':'1','lease_id':'done'},{'id':'2','lease_id':'new'}]}
  c.request=request;c.heartbeat()
  self.assertEqual([t['lease_id'] for t in c.tasks],['new'])
  self.assertFalse(app.stop.is_set())
 def test_farm_only_runs_enabled_due_governor_once(self):
  app=SimpleNamespace(stop=threading.Event(),vision=object(),log=Mock(),run_auto=Mock(return_value=(5,5)))
  c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.');c.report=Mock();c.read_resources=Mock(return_value={'food':1,'wood':2,'stone':3,'gold':4})
  cfg={'allocations':{'food':1,'wood':2,'stone':2,'gold':0},'level':8,'repeatHours':3.6,'claimAlliance':False}
  task={'id':'1','lease_id':'lease','governors':[{'id':'F1','name':'F1','enabled':True,'config':cfg},{'id':'F2','name':'F2','enabled':False,'config':cfg}]}
  with patch('characters.CharacterNavigator') as nav,patch('fleet_client.GameWindow.find',return_value=Mock()):
   c.farm_governors(task);c.farm_governors(task)
   self.assertEqual(nav.return_value.select.call_count,1)
   app.run_auto.assert_called_once_with(one_pass=True)
   nav.return_value.claim_alliance.assert_not_called()
   self.assertEqual([call.args[1] for call in c.report.call_args_list],['farm_started','farm_done'])
   self.assertEqual(c.report.call_args_list[-1].kwargs['resources'],{'food':1,'wood':2,'stone':3,'gold':4})
if __name__=='__main__':unittest.main()

class FleetRetryTests(unittest.TestCase):
 def test_fail_safe_waits_three_seconds_before_retry(self):
  import pyautogui as pg
  app=SimpleNamespace(stop=threading.Event(),vision=object(),log=Mock())
  with tempfile.TemporaryDirectory() as root:
   c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},root)
   c.desired='run';c.last_ok=time.monotonic();c.heartbeat=Mock();c.report=Mock()
   c.tasks=[{'id':'1','email':'test@example.invalid','config':{'allocations':{'food':1},'level':8},'credential':{'password':'test'},'lease_id':'lease'}]
   def end_retry(seconds):
    self.assertEqual(seconds,3);c.closed.set();return True
   with patch.object(c.closed,'wait',side_effect=end_retry) as wait,patch('fleet_client.GameWindow.find',side_effect=pg.FailSafeException()):c.run()
   wait.assert_called_once_with(3);app.log.assert_called()
