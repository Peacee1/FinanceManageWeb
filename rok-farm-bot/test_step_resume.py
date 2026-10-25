import unittest,threading,tempfile
from types import SimpleNamespace
from unittest.mock import Mock,patch
import numpy as np
from collections import Counter
from account_login import AccountLogin,android_login_overlay,android_overlay_texts
from characters import CharacterNavigator,Character,same_name
from fleet_client import FleetClient
from step_retry import retry_step

class ResumeStageTests(unittest.TestCase):
 def app(self):return SimpleNamespace(stop=threading.Event(),vision=SimpleNamespace(mobile=True),log=Mock(),active=Mock(return_value=True))
 def test_foreground_password_link_wins_over_background_switch(self):
  app=self.app();login=AccountLogin(app);login.nav=Mock()
  screen=np.zeros((900,1600,3),np.uint8);screen[245:656,545:1055]=255
  texts=[('trungtamnguoidung',(150,28),'Trung Tâm Người Dùng'),
         ('chuyentaikhoan',(690,95),'Chuyển tài khoản'),
         ('dangnhapvaotaikhoankhac',(800,200),'Đăng nhập vào tài khoản khác'),
         ('dangnhapbangmatkhau',(800,570),'Đăng nhập bằng mật khẩu')]
  before=('account_dialog',screen,(0,0),[],texts)
  form={'email':(800,350),'password':(800,435),'submit':(800,520)}
  after=('account_dialog',screen,(0,0),[],[('testexampleinvalid',(800,350),'test@example.invalid')])
  login.nav.inspect.side_effect=[before,before,after,after,after,after,after]
  login.fill=Mock();login.dismiss_password_hint=Mock();login.point=Mock(return_value=(800,570))
  with patch('account_login.android_password_form',side_effect=[None,form,form,form,form]):
   login.login('test@example.invalid','test-password')
  self.assertEqual(login.nav.click.call_args_list[0].args,((800,570),(0,0)))
  self.assertEqual(login.point.call_args.args[1],'dangnhapbangmatkhau')
  self.assertEqual(len(login.point.call_args.args[0]),1)
  login.nav.open_list.assert_not_called()
 def test_unknown_foreground_dialog_never_clicks_background(self):
  app=self.app();login=AccountLogin(app);login.nav=Mock()
  screen=np.zeros((900,1600,3),np.uint8);screen[245:656,545:1055]=255
  login.nav.inspect.return_value=('account_dialog',screen,(0,0),[],[
      ('trungtamnguoidung',(150,28),'Trung Tâm Người Dùng'),
      ('chuyentaikhoan',(690,95),'Chuyển tài khoản')])
  def pause(_):app.stop.set();raise RuntimeError('test stopped')
  login.nav.pause.side_effect=pause
  with self.assertRaises(RuntimeError):login.login('test@example.invalid','test-password')
  login.nav.click.assert_not_called();login.nav.open_list.assert_not_called()
 def test_saved_account_then_password_overlay_then_form(self):
  import cv2
  app=self.app();login=AccountLogin(app);login.nav=Mock()
  saved=cv2.imread('ldplayer-captures/android-saved-account-overlay.png')
  password=cv2.imread('ldplayer-captures/android-login-overlay.png')
  background=[('trungtamnguoidung',(150,28),'Trung Tâm Người Dùng'),
              ('chuyentaikhoan',(690,95),'Chuyển tài khoản')]
  saved_texts=background+[('chuyentaikhoan',(800,335),'Chuyển tài khoản'),
              ('dangnhapvaotaikhoankhac',(800,558),'Đăng nhập vào tài khoản khác')]
  password_texts=background+[('dangnhapbangmatkhau',(800,570),'Đăng nhập bằng mật khẩu')]
  phases={'value':0};form={'email':(800,350),'password':(800,435),'submit':(800,520)}
  def inspect():
   i=phases['value']
   return ('account_dialog',saved if i==0 else password,(0,0),[],saved_texts if i==0 else password_texts if i==1 else [('testexampleinvalid',(800,350),'test@example.invalid')])
  def point(texts,target,screen):
   from vision import normalize
   return next(c for n,c,_ in texts if n==normalize(target))
  def click(*_):phases['value']+=1
  login.nav.inspect.side_effect=inspect;login.nav.click.side_effect=click;login.point=Mock(side_effect=point)
  login.fill=Mock();login.dismiss_password_hint=Mock()
  with patch('account_login.android_password_form',side_effect=lambda *_:form if phases['value']>=2 else None):
   login.login('test@example.invalid','test-password')
  self.assertEqual([c.args[1] for c in login.point.call_args_list],['Đăng nhập vào tài khoản khác','dangnhapbangmatkhau'])
  self.assertEqual([c.args[0] for c in login.nav.click.call_args_list],[(800,558),(800,570),(800,520)])
  login.nav.open_list.assert_not_called()
 def test_saved_overlay_bounds_exclude_switch_account(self):
  import cv2
  screen=cv2.imread('ldplayer-captures/android-login-overlay.png')
  panel=android_login_overlay(screen)
  self.assertIsNotNone(panel)
  texts=[('chuyentaikhoan',(690,95),'Chuyển tài khoản'),
         ('dangnhapbangmatkhau',(800,570),'Đăng nhập bằng mật khẩu')]
  self.assertEqual([t[0] for t in android_overlay_texts(texts,panel)],['dangnhapbangmatkhau'])
 def test_password_load_failures_do_not_repeat_email_or_submit(self):
  app=self.app();login=AccountLogin(app);login.nav=Mock();counts=Counter();typed={'email':False}
  screen=np.zeros((900,1600,3),np.uint8);form={'email':(800,350),'password':(800,435),'submit':(800,520)}
  def inspect():return ('account_dialog',screen,(0,0),[],[('testexampleinvalid',(800,350),'test@example.invalid')] if typed['email'] else [])
  login.nav.inspect.side_effect=inspect
  def fill(point,offset,value):
   counts[value]+=1
   if counts[value]==1:raise RuntimeError('temporary input failure')
   if value=='test@example.invalid':typed['email']=True
  login.fill=Mock(side_effect=fill);login.dismiss_password_hint=Mock()
  login.nav.wait_loaded_map.side_effect=[RuntimeError('still loading'),None]
  with patch('account_login.android_password_form',return_value=form),patch.object(app.stop,'wait',return_value=False):login.login('test@example.invalid','test-password')
  self.assertEqual(counts,{'test@example.invalid':2,'test-password':2})
  login.nav.click.assert_called_once_with(form['submit'],(0,0))
  self.assertEqual(login.nav.wait_loaded_map.call_count,2);login.nav.open_list.assert_not_called()
 def test_farm_and_report_retries_keep_character_and_cycle(self):
  app=self.app();app.run_auto=Mock();nav=Mock()
  c=FleetClient(app,{'server':'https://rokbot.peacee1.io.vn','token':'x','botId':'y'},'.')
  cfg={'allocations':{'wood':2,'stone':2,'gold':1,'food':0},'level':8,'repeatHours':3.6,'claimAlliance':True}
  g={'id':'2771:F1','name':'F1','config':cfg};task={'id':'1','lease_id':'lease'}
  def farm(**kwargs):
   if app.run_auto.call_count==1:app.cycle.confirm_dispatch();raise RuntimeError('OCR queue transient')
   self.assertEqual(app.cycle.cursor,1);return (5,5)
  app.run_auto.side_effect=farm
  done={'count':0}
  def report(task,status,**kwargs):
   if status=='farm_done':
    done['count']+=1
    if done['count']==1:raise OSError('network response lost')
  c.report=Mock(side_effect=report);c.read_resources=Mock(return_value=None)
  with patch.object(app.stop,'wait',return_value=False):c.farm_one(task,g,nav)
  nav.select.assert_called_once();nav.claim_alliance_optional.assert_called_once()
  self.assertEqual(app.run_auto.call_count,2);c.read_resources.assert_called_once()
  self.assertEqual([call.args[1] for call in c.report.call_args_list],['farm_started','farm_done','farm_done'])
 def test_character_wait_failure_never_clicks_yes_twice(self):
  app=self.app();nav=CharacterNavigator(app);nav.close_to_map=Mock();nav.pause=Mock();nav.click=Mock()
  target=Character('3590:chicken8f','Chicken 8f','3590',(500,300))
  active=Character(target.identity,target.name,target.kingdom,target.point,True)
  nav.find=Mock(side_effect=[(target,None,(0,0)),RuntimeError('roster redraw'),(active,None,(0,0))])
  screen=np.zeros((900,1600,3),np.uint8)
  nav.inspect=Mock(return_value=('confirm_character',screen,(0,0),[],[('chicken8f',(800,562),'Chicken 8f')]))
  app.vision.icon=Mock(return_value=(.9,(1020,640)));nav.recover_loading_window=Mock()
  nav.wait_loaded_map=Mock(side_effect=[RuntimeError('loading'),None])
  nav.profile_matches=Mock(side_effect=[False,True])
  with patch.object(app.stop,'wait',return_value=False):nav.select(target)
  nav.click.assert_called_once_with((1020,640),(0,0));self.assertEqual(nav.wait_loaded_map.call_count,2)
 def test_governor_numbers_are_exact(self):
  self.assertFalse(same_name('Chicken 8f','Chicken 7f'))
  self.assertFalse(same_name('Chicken 8f','Chicken 4'))
  self.assertFalse(same_name('hivchicken11','Chicken 8f'))
  self.assertTrue(same_name('PeaceelX F10','Peacee1X F10'))
 def test_stop_interrupts_stage_retry(self):
  app=self.app();action=Mock(side_effect=RuntimeError('failure'))
  with patch.object(app.stop,'wait',return_value=True) as wait:
   with self.assertRaises(RuntimeError):retry_step(app,'input',action)
  action.assert_called_once();wait.assert_called_once_with(3)
