import unittest
import threading
from pathlib import Path
import numpy as np
from types import SimpleNamespace
from unittest.mock import Mock,patch
from account_login import AccountLogin
class LoginInputTests(unittest.TestCase):
 def test_pc_filled_email_continues_with_password_only(self):
  app=SimpleNamespace(vision=SimpleNamespace(mobile=False),log=Mock())
  login=AccountLogin(app);login.nav=Mock();login.fill=Mock()
  screen=np.zeros((900,1600,3),np.uint8)
  form={'email':(800,350),'password':(800,430),'submit':(800,520)}
  texts=[('dangnhapmatkhau',(800,270),'Đăng nhập mật khẩu'),('aexampleinvalid',(800,350),'a@example.invalid')]
  observation=('account_dialog',screen,(0,30),[],texts)
  login.nav.inspect.side_effect=[observation,observation,('inside',screen,(0,30),[],[])]
  login.nav.recover_loading_window.return_value=True
  login.nav.text_point.return_value=form['submit']
  login.dismiss_password_hint=Mock(return_value=observation)
  with patch('account_login.android_password_form',return_value=form):login.login_legacy('a@example.invalid','private-password')
  login.fill.assert_called_once_with(form['password'],(0,30),'private-password')
  login.nav.open_list.assert_not_called()
 def test_pc_user_center_waits_for_visible_dialog(self):
  app=SimpleNamespace(vision=Mock(),log=Mock());app.vision.icon.return_value=(.8,(300,200))
  login=AccountLogin(app);login.nav=Mock()
  roster=('characters',np.zeros((700,1000,3),np.uint8),(0,30),[],[])
  center=('account_dialog',roster[1],roster[2],[],[('trungtamnguoidung',(500,150),'Trung Tâm Người Dùng')])
  login.nav.inspect.side_effect=[roster,roster,center]
  with patch('account_login.pg.moveTo'),patch('account_login.pg.mouseDown') as down,patch('account_login.pg.mouseUp') as up:
   self.assertIs(login.open_pc_user_center(),center)
  down.assert_called_once();up.assert_called_once();self.assertEqual(login.nav.inspect.call_count,3)
 def test_pc_user_center_releases_mouse_when_stop_interrupts_hold(self):
  app=SimpleNamespace(vision=Mock(),log=Mock());app.vision.icon.return_value=(.8,(300,200))
  login=AccountLogin(app);login.nav=Mock();login.nav.inspect.return_value=('characters',np.zeros((700,1000,3),np.uint8),(0,0),[],[])
  login.nav.pause.side_effect=RuntimeError('Stopped')
  with patch('account_login.pg.moveTo'),patch('account_login.pg.mouseDown'),patch('account_login.pg.mouseUp') as up:
   with self.assertRaises(RuntimeError):login.open_pc_user_center()
  up.assert_called_once()
 def test_pc_user_center_does_not_click_if_already_open(self):
  login=AccountLogin(SimpleNamespace(vision=Mock(),log=Mock()));login.nav=Mock()
  login.nav.inspect.return_value=('account_dialog',None,None,[],[('trungtamnguoidung',(0,0),'')])
  with patch('account_login.pg.mouseDown') as down:login.open_pc_user_center()
  down.assert_not_called()
 def test_retry_after_confirmed_account_only_closes_to_map(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()));login.nav=Mock();login.pending_return_email='a@example.invalid'
  login.login_legacy('a@example.invalid','password')
  login.nav.close_to_map.assert_called_once();login.nav.inspect.assert_not_called()
  self.assertIsNone(login.pending_return_email)
 def test_login_deadline_is_renewed_and_cleared_after_failure(self):
  login=AccountLogin(SimpleNamespace(vision=SimpleNamespace(mobile=False)))
  seen=[]
  def fail(*args):seen.append(login.nav.transition_deadline);raise RuntimeError('test')
  login.login_legacy=fail
  for stamp in (100,500):
   with patch('account_login.time.monotonic',return_value=stamp):
    with self.assertRaises(RuntimeError):login.login('a','b')
   self.assertEqual(login.nav.transition_deadline,0)
  self.assertEqual(seen,[340,740])
 def test_ascii_credentials_use_game_keyboard_input(self):
  app=SimpleNamespace(vision=Mock(),stop=Mock(is_set=Mock(return_value=False)));login=AccountLogin(app)
  login.nav=Mock()
  with patch('secure_paste.paste_text') as paste,patch('account_login.pg.hotkey') as hotkey:
   login.fill((100,100),(0,0),'test@example.invalid')
   paste.assert_called_once_with('test@example.invalid')
   hotkey.assert_called_once_with('ctrl','a')
 def test_hint_is_blurred_before_fresh_inspection(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()));login.nav=Mock();login.point=Mock(return_value=(880,250))
  fresh=(None,np.zeros((900,1600,3),np.uint8),(0,0),[],[]);login.nav.inspect.return_value=fresh
  result=login.dismiss_password_hint(fresh[1],(10,20),[])
  login.nav.click.assert_called_once_with((880,214),(10,20))
  self.assertIs(result,fresh)
 def test_remaining_hint_prevents_submission(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()));login.nav=Mock();login.point=Mock(return_value=(880,250))
  login.nav.inspect.return_value=(None,None,None,[],[('matkhauphaidai616kytu',(0,0),'Mật khẩu phải dài')])
  with self.assertRaises(RuntimeError):login.dismiss_password_hint(np.zeros((900,1600,3),np.uint8),(0,0),[])
 def test_clipboard_restores_text_even_if_paste_fails(self):
  from secure_paste import paste_text
  with patch('secure_paste.read_text',return_value='previous text'),patch('secure_paste.put_text') as put,patch('secure_paste.pg.hotkey',side_effect=RuntimeError('input failed')):
   with self.assertRaises(RuntimeError):paste_text('private-test-value')
   self.assertEqual(put.call_args_list[-1].args,('previous text',))
 def test_existing_matching_account_skips_login(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()));login.nav=Mock()
  texts=[('trungtamnguoidung',(0,0),'Trung Tâm Người Dùng'),('testexamplecom',(0,0),'test@example.com')]
  observation=(None,np.zeros((900,1600,3),np.uint8),(0,0),[],texts)
  login.nav.inspect.return_value=observation
  login.app.log=Mock()
  login.login('test@example.com','password-test')
  login.nav.click.assert_not_called()
  login.nav.close_to_map.assert_called_once()
if __name__=='__main__':unittest.main()

class EmailRegionTests(unittest.TestCase):
 def test_email_field_excludes_password_and_headers(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()))
  texts=[('dangnhapmatkhau',(850,100),'Đăng nhập mật khẩu'),
         ('nhapdiachiemailcuaban',(800,180),'Nhập địa chỉ e-mail của bạn'),
         ('nhapmatkhaucuaban',(800,290),'Nhập mật khẩu của bạn')]
  self.assertEqual(login.point(texts,'Nhập địa chỉ e-mail của bạn',np.zeros((900,1600,3),np.uint8)),(800,180))
 def test_missing_password_tab_does_not_guess(self):
  login=AccountLogin(SimpleNamespace(vision=Mock()))
  with self.assertRaises(RuntimeError):login.point([], 'Nhập địa chỉ e-mail của bạn',np.zeros((900,1600,3),np.uint8))

class AndroidPasswordFormTests(unittest.TestCase):
 def test_recorded_form_without_password_tab(self):
  import json,cv2
  from pathlib import Path
  from vision import normalize
  from account_login import android_password_form
  p=Path('ldplayer-captures/android-password-form')
  screen=cv2.imdecode(np.fromfile(p.with_suffix('.png'),dtype=np.uint8),1)
  rows=json.loads(p.with_suffix('.json').read_text('utf-8'))
  texts=[(normalize(t),np.mean(b,axis=0),t) for b,t,c in rows if c>=.5]
  form=android_password_form(texts,screen)
  self.assertIsNotNone(form)
  self.assertLess(abs(form['email'][1]-352),4)
  self.assertLess(abs(form['password'][1]-435),4)
  self.assertLess(abs(form['submit'][1]-521),4)
 def test_background_email_cannot_be_form(self):
  from account_login import android_password_form
  screen=np.zeros((900,1600,3),np.uint8)
  texts=[('diachiemail',(160,250),''),('nhapmatkhau',(800,435),''),('dangnhap',(800,521),'')]
  self.assertIsNone(android_password_form(texts,screen))
 def test_reversed_fields_rejected(self):
  from account_login import android_password_form
  texts=[('diachiemail',(800,435),''),('nhapmatkhau',(800,352),''),('dangnhap',(800,521),'')]
  self.assertIsNone(android_password_form(texts,np.zeros((900,1600,3),np.uint8)))

class AndroidInputTests(unittest.TestCase):
 def test_filled_fields_recognized_by_rectangle(self):
  import json,cv2
  from account_login import android_password_form
  from vision import normalize
  rows=json.loads(Path('ldplayer-captures/android-password-form.json').read_text('utf-8'))
  texts=[(normalize(t),np.mean(b,axis=0),t) for b,t,c in rows if c>.5 and normalize(t) not in {'diachiemail','nhapmatkhau'}]
  screen=cv2.imdecode(np.fromfile('ldplayer-captures/android-password-filled.png',dtype=np.uint8),1)
  form=android_password_form(texts,screen)
  self.assertIsNotNone(form);self.assertEqual(form['email'],(800,351));self.assertEqual(form['password'],(800,434))
 def test_android_types_without_clipboard(self):
  login=AccountLogin(SimpleNamespace(vision=SimpleNamespace(mobile=True),stop=threading.Event()));login.nav=Mock()
  with patch('secure_paste.paste_text') as paste,patch('account_login.pg.hotkey') as hotkey,patch('account_login.pg.press') as press:
   login.fill((800,351),(0,35),'test@example.invalid')
   self.assertEqual(hotkey.call_args_list[0].args,('ctrl','a'))
   self.assertIn(unittest.mock.call('shift','2'),hotkey.call_args_list)
   self.assertEqual(press.call_args_list[0].args,('backspace',))
   self.assertNotIn(unittest.mock.call('@'),press.call_args_list);paste.assert_not_called()

 def test_shifted_password_symbols_and_uppercase(self):
  login=AccountLogin(SimpleNamespace(vision=SimpleNamespace(mobile=True),stop=threading.Event()));login.nav=Mock()
  with patch('account_login.pg.hotkey') as hotkey,patch('account_login.pg.press') as press:
   login.fill((800,434),(0,35),'A@_!')
   self.assertEqual(hotkey.call_args_list,[unittest.mock.call('ctrl','a'),unittest.mock.call('shift','a'),unittest.mock.call('shift','2'),unittest.mock.call('shift','-'),unittest.mock.call('shift','1')])
   press.assert_called_once_with('backspace')
