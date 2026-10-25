import io,threading,unittest,urllib.error
from types import SimpleNamespace
from unittest.mock import Mock,patch
from fleet_client import FleetClient
from step_retry import retry_step

class FleetHttpTests(unittest.TestCase):
 def client(self):
  app=SimpleNamespace(stop=threading.Event(),log=Mock())
  c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'not-logged','botId':'test'},'.')
  c.tasks=[{'id':'12','lease_id':'new','governors':[]}]
  return c
 def test_revoked_lease_cancels_retry_and_removes_only_old_assignment(self):
  c=self.client();c.tasks.append({'id':'12','lease_id':'old'})
  error=urllib.error.HTTPError('https://example.invalid',409,'Conflict',{},io.BytesIO(b'private response'))
  with patch('urllib.request.urlopen',side_effect=error) as request:
   with self.assertRaisesRegex(RuntimeError,'HTTP 409'):
    retry_step(c.app,'report',lambda:c.report({'id':'12','lease_id':'old'},'farm_started',governor_id='x'))
  self.assertTrue(c.app.stop.is_set());self.assertEqual(request.call_count,1)
  self.assertEqual([t['lease_id'] for t in c.tasks],['new'])
  self.assertNotIn('private response',str(c.app.log.call_args_list))
 def test_server_error_remains_retryable_without_response_body(self):
  c=self.client();error=urllib.error.HTTPError('https://example.invalid',503,'Unavailable',{},io.BytesIO(b'secret'))
  with patch('urllib.request.urlopen',side_effect=error):
   with self.assertRaisesRegex(RuntimeError,'HTTP 503') as caught:c.report({'id':'12','lease_id':'new'},'farm_started')
  self.assertFalse(c.app.stop.is_set());self.assertNotIn('secret',str(caught.exception))
 def test_current_assignment_requires_matching_lease(self):
  c=self.client()
  self.assertFalse(c.assignment_current({'id':12,'lease_id':'old'}))
  self.assertTrue(c.assignment_current({'id':12,'lease_id':'new'}))
 def test_heartbeat_replaced_lease_cancels_current_work(self):
  c=self.client();c.current='12';c.current_lease='old'
  c.request=Mock(return_value={'desired':'run','tasks':c.tasks})
  c.closed.wait=Mock(side_effect=lambda _:c.closed.set())
  c.heartbeat()
  self.assertTrue(c.app.stop.is_set())
 def test_unauthorized_client_clears_cached_tasks(self):
  c=self.client();c.last_ok=123
  error=urllib.error.HTTPError('https://example.invalid',401,'Unauthorized',{},io.BytesIO())
  with patch('urllib.request.urlopen',side_effect=error):
   with self.assertRaisesRegex(RuntimeError,'HTTP 401'):c.request('heartbeat',{})
  self.assertEqual(c.tasks,[]);self.assertEqual(c.last_ok,0)
