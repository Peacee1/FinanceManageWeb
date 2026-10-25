import unittest
from types import SimpleNamespace
from unittest.mock import Mock
import numpy as np
from account_login import AccountLogin,android_password_form,pc_filled_email_form

class PCFilledEmailFormTests(unittest.TestCase):
 def fixture(self):
  # No grey field rectangles and no email placeholder: this is the failed
  # path v37's mocked form test could not exercise.
  screen=np.zeros((900,1600,3),np.uint8)
  texts=[('dangnhapmatkhau',(850,280),'Đăng nhập mật khẩu'),
         ('testexampleinvalid',(760,360),'test@example.invalid'),
         ('nhapmatkhau',(760,430),'Nhập mật khẩu'),
         ('dangnhapngay',(800,560),'Đăng nhập ngay')]
  return screen,texts
 def test_filled_email_works_when_grey_rectangle_detector_fails(self):
  screen,texts=self.fixture()
  self.assertIsNone(android_password_form(texts,screen))
  form=pc_filled_email_form(texts,screen,'test@example.invalid')
  self.assertEqual(form,{'email':(760,360),'password':(760,430),'submit':(800,560)})
 def test_full_pc_flow_only_fills_password_without_mocking_form_detection(self):
  screen,texts=self.fixture();obs=('account_dialog',screen,(0,30),[],texts)
  login=AccountLogin(SimpleNamespace(vision=SimpleNamespace(mobile=False),log=Mock()))
  login.nav=Mock();login.fill=Mock();login.dismiss_password_hint=Mock(return_value=obs)
  login.nav.inspect.side_effect=[obs,obs,('inside',screen,(0,30),[],[])]
  login.nav.text_point.return_value=(800,560)
  login.nav.recover_loading_window.return_value=True
  login.login_legacy('test@example.invalid','private')
  login.fill.assert_called_once_with((760,430),(0,30),'private')
  login.nav.open_list.assert_not_called()
 def test_wrong_email_does_not_authorize_password_entry(self):
  screen,texts=self.fixture()
  self.assertIsNone(pc_filled_email_form(texts,screen,'other@example.invalid'))
 def test_password_heading_alone_is_not_an_input(self):
  screen,texts=self.fixture()
  self.assertIsNone(pc_filled_email_form([t for t in texts if t[0]!='nhapmatkhau'],screen,'test@example.invalid'))
 def test_duplicate_distinct_password_fields_are_not_guessed(self):
  screen,texts=self.fixture();texts.append(('nhapmatkhau',(900,450),'Nhập mật khẩu'))
  self.assertIsNone(pc_filled_email_form(texts,screen,'test@example.invalid'))
