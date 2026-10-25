import unittest
from unittest.mock import patch
from ldplayer_window import parse_instances,LDPlayerWindow
from game_window import GameWindow

class LDPlayerTests(unittest.TestCase):
 def test_running_instance_handles_and_inactive_instances(self):
  result=parse_instances('0,LDPlayer,2032678,1704928,1,7456,3500\n1,LDPlayer-1,852422,590830,0,3772,3180\nbad row')
  self.assertEqual(result,[{'index':0,'name':'LDPlayer','top':2032678,'bound':1704928,'pid':7456}])
 def test_multiple_instances_are_not_merged(self):
  result=parse_instances('0,LDPlayer,100,110,1,200,300\n2,Farm 2,120,130,1,210,310,1280,720,240')
  self.assertEqual([i['index'] for i in result],[0,2])
 def test_ld_flag_routes_to_emulator_backend(self):
  with patch('game_window.sys.argv',['tool','--ldplayer']),patch.object(LDPlayerWindow,'find',return_value='emulator'):
   self.assertEqual(GameWindow.find(),'emulator')

class AutoDiscoveryTests(unittest.TestCase):
 def test_unique_instance_is_saved_without_manual_selection(self):
  from ldplayer_window import discover_instance
  instance={'index':3,'name':'Farm','top':100,'bound':110,'pid':200}
  with patch('ldplayer_window.running_console_paths',return_value=['D:/Emulators/LD/ldconsole.exe']),patch('ldplayer_window.list_instances',return_value=[instance]),patch('ldplayer_window.user32.IsWindowVisible',return_value=True),patch('ldplayer_window.save_instance') as save:
   self.assertEqual(discover_instance(),instance)
   save.assert_called_once_with('D:/Emulators/LD/ldconsole.exe',3)
 def test_multiple_instances_require_selection(self):
  from ldplayer_window import discover_instance
  with patch('ldplayer_window.running_console_paths',return_value=['C:/LD/ldconsole.exe']),patch('ldplayer_window.list_instances',return_value=[{'index':0,'top':1,'bound':2},{'index':1,'top':3,'bound':4}]),patch('ldplayer_window.user32.IsWindowVisible',return_value=True),patch('ldplayer_window.save_instance') as save:
   with self.assertRaisesRegex(RuntimeError,'nhiều'):discover_instance()
   save.assert_not_called()
 def test_same_instance_found_by_two_console_names_is_not_ambiguous(self):
  from ldplayer_window import discover_instance
  instance={'index':0,'top':100,'bound':110}
  with patch('ldplayer_window.running_console_paths',return_value=['C:/LD/ldconsole.exe','C:/LD/dnconsole.exe']),patch('ldplayer_window.list_instances',return_value=[instance]),patch('ldplayer_window.user32.IsWindowVisible',return_value=True),patch('ldplayer_window.save_instance'):
   self.assertEqual(discover_instance(),instance)
 def test_missing_config_uses_discovery(self):
  from unittest.mock import Mock
  config=Mock();config.read_text.side_effect=FileNotFoundError()
  instance={'index':0,'top':100,'bound':110}
  with patch('ldplayer_window.CONFIG_FILE',config),patch('ldplayer_window.discover_instance',return_value=instance),patch('ldplayer_window.user32.IsWindowVisible',return_value=True):
   window=LDPlayerWindow.find()
   self.assertEqual(window.hwnd,100);self.assertEqual(window.capture_hwnd,110)
 def test_existing_selected_instance_is_preserved(self):
  from unittest.mock import Mock
  config=Mock();config.read_text.return_value='{"console":"C:/LD/ldconsole.exe","index":2}'
  instance={'index':2,'top':100,'bound':110}
  with patch('ldplayer_window.CONFIG_FILE',config),patch('ldplayer_window.list_instances',return_value=[instance]),patch('ldplayer_window.discover_instance') as discover,patch('ldplayer_window.user32.IsWindowVisible',return_value=True):
   self.assertEqual(LDPlayerWindow.find().instance,instance);discover.assert_not_called()
