import unittest
from types import SimpleNamespace
from unittest.mock import Mock,patch
import numpy as np
from account_login import AccountLogin

class PCAccountChooserTests(unittest.TestCase):
 def login(self):
  result=AccountLogin(SimpleNamespace(vision=SimpleNamespace(mobile=False),log=Mock()))
  result.nav=Mock();return result
 def observation(self,texts):return ('account_dialog',np.zeros((900,1600,3),np.uint8),(10,30),[],texts)
 def test_duplicate_ocr_of_one_button_is_not_ambiguous(self):
  login=self.login();screen=np.zeros((900,1600,3),np.uint8)
  texts=[('dangnhapvaotaikhoankhac',(800,650),''),('dangnhapvaotaikhoankhac',(802,651),''),('dangnhapbangmaxacminh',(800,300),'')]
  self.assertEqual(login.point(texts,'Đăng nhập vào tài khoản khác',screen),(800,650))
 def test_two_distinct_buttons_remain_ambiguous(self):
  login=self.login();texts=[('dangnhapvaotaikhoankhac',(700,600),''),('dangnhapvaotaikhoankhac',(900,700),'')]
  with self.assertRaises(RuntimeError):login.point(texts,'Đăng nhập vào tài khoản khác',np.zeros((900,1600,3),np.uint8))
 def test_waits_for_chooser_before_click_and_for_password_form_after(self):
  login=self.login()
  center=self.observation([('trungtamnguoidung',(800,250),'')])
  chooser=self.observation([('chontaikhoan',(800,250),''),('dangnhapvaotaikhoankhac',(800,650),'')])
  form=self.observation([('dangnhapmatkhau',(800,300),'')])
  login.nav.inspect.side_effect=[center,chooser,chooser,form]
  self.assertIs(login.wait_pc_other_account(),form)
  login.nav.click.assert_called_once_with((800,650),(10,30))
  login.nav.open_list.assert_not_called()
 def test_front_password_dialog_blocks_background_chooser_button(self):
  login=self.login();form=self.observation([('dangnhapmatkhau',(800,300),''),('dangnhapvaotaikhoankhac',(800,650),'')])
  login.nav.inspect.return_value=form
  self.assertIs(login.wait_pc_other_account(),form)
  login.nav.click.assert_not_called()
 def test_retry_from_chooser_does_not_reopen_game_menus(self):
  login=self.login();login.fill=Mock()
  chooser=self.observation([('chontaikhoan',(800,250),'')])
  form=self.observation([('dangnhapmatkhau',(800,270),''),('aexampleinvalid',(800,350),'a@example.invalid')])
  inside=('inside',form[1],form[2],[],[])
  login.nav.inspect.side_effect=[chooser,form,inside]
  login.wait_pc_other_account=Mock(return_value=form)
  login.dismiss_password_hint=Mock(return_value=form)
  login.nav.text_point.return_value=(800,520)
  login.nav.recover_loading_window.return_value=True
  with patch('account_login.android_password_form',return_value={'email':(800,350),'password':(800,430),'submit':(800,520)}):
   login.login_legacy('a@example.invalid','private')
  login.nav.open_list.assert_not_called();login.wait_pc_other_account.assert_called_once()
  login.fill.assert_called_once_with((800,430),(10,30),'private')
