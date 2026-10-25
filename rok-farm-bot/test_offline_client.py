import unittest,sys,subprocess,json
from types import SimpleNamespace
from unittest.mock import Mock,patch
from bot import App

class OfflineClientTests(unittest.TestCase):
 def test_offline_connect_is_blocked_before_reading_pairing(self):
  app=SimpleNamespace(log=Mock())
  with patch.object(sys,'argv',['pc_offline_bot','--offline']):App.connect_fleet(app)
  app.log.assert_called_once()
 def test_offline_entry_uses_separate_data_and_forces_pc_mode(self):
  code='import sys,json;sys.argv=["test","--ldplayer","--fleet"];import pc_offline_bot;from bot import ROOT;print(json.dumps({"root":ROOT.name,"args":sys.argv}))'
  p=subprocess.run([sys.executable,'-c',code],capture_output=True,text=True,check=True)
  result=json.loads(p.stdout)
  self.assertEqual(result['root'],'ROKFarmBotPCOffline')
  self.assertIn('--offline',result['args']);self.assertNotIn('--fleet',result['args']);self.assertNotIn('--ldplayer',result['args'])
