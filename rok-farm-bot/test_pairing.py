import json,tempfile,unittest,threading
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
from pairing import load_pairing
from fleet_client import FleetClient
class PairingTests(unittest.TestCase):
 def test_bom_json_and_token_are_preserved(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'client.json';v={'server':'https://rokbot.peacee1.io.vn','botId':'844a0577-9df4-4ba0-a881-52396542a8b9','token':'a'*64};p.write_text(json.dumps(v),encoding='utf-8-sig');self.assertEqual(load_pairing(p),v)
 def test_heartbeat_uses_selected_json_token(self):
  app=SimpleNamespace(stop=threading.Event(),log=Mock(),vision=object());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','botId':'qa','token':'a'*64},'.')
  import io
  response=Mock();response.__enter__=Mock(return_value=io.BytesIO(b'{"desired":"stop","tasks":[]}'));response.__exit__=Mock(return_value=False)
  with patch('urllib.request.urlopen',return_value=response) as send:
   c.request('heartbeat',{'status':'idle'});self.assertEqual(send.call_args.args[0].get_header('Authorization'),'Bearer '+'a'*64)
 def test_heartbeat_error_is_visible_and_redacted(self):
  app=SimpleNamespace(stop=threading.Event(),log=Mock());c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','botId':'qa','token':'private'},'.');c.request=Mock(side_effect=OSError('failed private'));c.closed.wait=Mock(side_effect=lambda _:c.closed.set());c.heartbeat();self.assertIn('heartbeat',app.log.call_args.args[0]);self.assertNotIn('private',app.log.call_args.args[0])