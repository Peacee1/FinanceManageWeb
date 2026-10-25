import threading,unittest,tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
from fleet_client import FleetClient

class FleetStartupTests(unittest.TestCase):
 def client(self,root):
  app=SimpleNamespace(stop=threading.Event(),vision=None,log=Mock())
  return FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'private-test-token','botId':'qa'},root)
 def test_heartbeat_arrives_while_ocr_initialization_is_blocked(self):
  with tempfile.TemporaryDirectory() as root:
   c=self.client(root);initializing=threading.Event();release=threading.Event();heartbeat=threading.Event();sent=[]
   def request(path,body):sent.append(body);heartbeat.set();return {'desired':'stop','tasks':[]}
   c.request=request
   def vision(*args):initializing.set();release.wait(4);return object()
   with patch('error_reporter.ErrorReporter'),patch('vision.Vision',side_effect=vision),patch('fleet_client.pg.size',return_value=SimpleNamespace(width=1920,height=1080)):
    worker=threading.Thread(target=c.run,daemon=True);worker.start()
    try:
     self.assertTrue(initializing.wait(2));self.assertTrue(heartbeat.wait(2));self.assertGreater(c.last_ok,0);self.assertEqual(sent[0]['status'],'loading')
    finally:c.closed.set();release.set();worker.join(3)
    self.assertFalse(worker.is_alive())
 def test_ocr_failure_is_logged_without_token_and_remains_stoppable(self):
  with tempfile.TemporaryDirectory() as root:
   c=self.client(root)
   def stop_wait(seconds):self.assertEqual(seconds,10);c.closed.set()
   with patch('vision.Vision',side_effect=OSError('missing native library private-test-token')),patch.object(c.closed,'wait',side_effect=stop_wait):
    self.assertFalse(c.initialize_vision())
   message=c.app.log.call_args.args[0];self.assertIn('OSError',message);self.assertNotIn(c.token,message);self.assertTrue(c.app.stop.is_set())