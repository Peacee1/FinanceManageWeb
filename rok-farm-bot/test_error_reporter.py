import unittest,threading,time,base64
from types import SimpleNamespace
from unittest.mock import Mock,patch
import cv2
from error_reporter import diagnostic_payload,ErrorReporter

class ErrorReporterTests(unittest.TestCase):
 def test_manual_capture_posts_to_separate_endpoint_and_keeps_error_image(self):
  import json
  from PIL import Image
  import numpy as np
  r=ErrorReporter(SimpleNamespace(),'https://rokbot.peacee1.io.vn','token','v1',threading.Event())
  r.pending={'screenshot':'error-image'}
  with patch('error_reporter.ImageGrab.grab',return_value=Image.fromarray(np.zeros((400,600,3),np.uint8))),patch('error_reporter.urllib.request.urlopen') as send:
   r.send_capture('request-id')
  req=send.call_args.args[0];payload=json.loads(req.data)
  self.assertTrue(req.full_url.endswith('/capture'));self.assertEqual(payload['requestId'],'request-id')
  self.assertTrue(payload['screenshot'].startswith('/9j/'));self.assertLessEqual(len(payload['screenshot']),80000)
  self.assertEqual(r.pending,{'screenshot':'error-image'})
 def test_log_buffer_is_bounded_and_redacts_credentials(self):
  app=SimpleNamespace(fleet=SimpleNamespace(lock=threading.Lock(),tasks=[{'credential':{'password':'private-password'}}]))
  r=ErrorReporter(app,'https://rokbot.peacee1.io.vn','private-token','v1',threading.Event())
  for i in range(250):r.queue_log(str(i)+' private-password private-token test@example.com')
  self.assertEqual(len(r.logs),200)
  self.assertTrue(r.logs[0]['message'].startswith('50 '))
  self.assertNotIn('private-password',str(r.logs));self.assertNotIn('private-token',str(r.logs));self.assertNotIn('test@example.com',str(r.logs))
 def test_safe_game_image_is_bounded_and_secret_redacted(self):
  screen=cv2.imread('live-fixtures/inside.png')
  app=SimpleNamespace(error_screen=(screen,'inside',['Trong thanh'],time.monotonic()),fleet=SimpleNamespace(lock=threading.Lock(),tasks=[{'credential':{'password':'password-test'}}]))
  p=diagnostic_payload(app,'Lỗi user@example.com password-test TOKEN','TOKEN','fleet-v32')
  self.assertNotIn('password-test',p['message']);self.assertNotIn('user@example.com',p['message']);self.assertNotIn('TOKEN',p['message'])
  self.assertTrue(p['screenshot'].startswith('/9j/'));self.assertLessEqual(len(p['screenshot']),50000)
 def test_authentication_or_stale_screen_never_uploaded(self):
  screen=cv2.imread('live-fixtures/inside.png')
  for state,words,stamp in [('account_dialog',[],time.monotonic()),('inside',['Nhap mat khau'],time.monotonic()),('inside',[],time.monotonic()-121)]:
   app=SimpleNamespace(error_screen=(screen,state,words,stamp))
   self.assertIsNone(diagnostic_payload(app,'Lỗi','token','v1')['screenshot'])
 def test_repeated_error_does_not_recompress_or_queue_more_images(self):
  r=ErrorReporter(SimpleNamespace(),'https://rokbot.peacee1.io.vn','token','v1',threading.Event())
  with patch('error_reporter.diagnostic_payload',return_value={'message':'one'}) as build:
   r.emit('one');r.emit('two');self.assertEqual(build.call_count,1);self.assertEqual(r.pending,{'message':'one'})
