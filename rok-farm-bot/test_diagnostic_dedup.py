import unittest,threading,json
from types import SimpleNamespace
from unittest.mock import Mock,patch
from error_reporter import ErrorReporter
class DiagnosticDedupTests(unittest.TestCase):
 def test_same_server_error_does_not_upload_image(self):
  closed=threading.Event();r=ErrorReporter(SimpleNamespace(),'https://rokbot.peacee1.io.vn','token','fleet-v44',closed)
  r.pending={'message':'same step error','retryThreshold':True,'screenshot':'large image'}
  response=Mock()
  def read():closed.set();return json.dumps({'message':'same step error'}).encode()
  response.read.side_effect=read
  with patch('error_reporter.urllib.request.urlopen') as send:
   send.return_value.__enter__.return_value=response;r.run()
  self.assertEqual(send.call_count,1);req=send.call_args.args[0]
  self.assertTrue(req.full_url.endswith('/diagnostic-status'));self.assertEqual(req.get_method(),'GET');self.assertIsNone(r.pending)
 def test_forced_diagnostic_ignores_capture_cooldown_and_deduplicates(self):
  r=ErrorReporter(SimpleNamespace(),'https://rokbot.peacee1.io.vn','token','v44',threading.Event())
  r.emit('failure',force=True);self.assertTrue(r.pending['retryThreshold'])
  r.sent_error='failure';r.pending=None;r.emit('failure',force=True);self.assertIsNone(r.pending)
