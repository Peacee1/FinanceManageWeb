import unittest,threading
from unittest.mock import Mock,patch
import cv2,numpy as np
from vision import Vision,Observation,chat_panel
from bot import App
class ChatRecoveryTests(unittest.TestCase):
 def test_actual_vps_chat_overrides_outside(self):
  v=Vision('assets');image=cv2.imread('live-fixtures/oct19-error.jpg');rows,_=v.engine(image)
  self.assertTrue(chat_panel(image,rows));self.assertEqual(v.from_rows(image,rows).state,'chat')
  self.assertFalse(chat_panel(np.zeros_like(image),rows))
 def app(self,states):
  app=App.__new__(App);app.stop=threading.Event();app.active=lambda:True;app.log=Mock()
  image=np.zeros((600,1000,3),np.uint8);app.snapshot=Mock(return_value=(image,(0,0)))
  app.vision=Mock();app.vision.analyze.side_effect=[Observation(state=s) for s in states];return app
 def test_close_chat_then_read_fresh_map(self):
  app=self.app(['chat','outside'])
  with patch('bot.CharacterNavigator') as nav:
   self.assertEqual(app.detect()[0].state,'outside');nav.return_value.key.assert_called_once_with('esc')
  self.assertEqual(app.snapshot.call_count,2)
 def test_persistent_chat_does_not_fall_through_as_map(self):
  app=self.app(['chat','chat','chat'])
  with patch('bot.CharacterNavigator') as nav:
   with self.assertRaisesRegex(RuntimeError,'Bảng chat vẫn mở'):app.detect()
   self.assertEqual(nav.return_value.key.call_count,2)
