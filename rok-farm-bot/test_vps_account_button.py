import unittest
from pathlib import Path
import cv2
from vision import Vision

class VPSAccountButtonTests(unittest.TestCase):
 def test_full_button_is_found_on_actual_vps_error_image(self):
  root=Path(__file__).parent
  screen=cv2.imread(str(root/'live-fixtures/vps-account-button-error.jpg'))
  self.assertIsNotNone(screen)
  # Matching needs only icon assets; avoid initializing OCR for this test.
  vision=Vision.__new__(Vision)
  vision.icons={'account_button':cv2.imread(str(root/'assets/account_button.png'))}
  h,w=screen.shape[:2]
  self.assertIsNone(vision.icon('account_button',screen,(w*.22,h*.10,w*.43,h*.23)))
  found=vision.icon('account_button',screen,(w*.20,h*.16,w*.48,h*.29))
  self.assertIsNotNone(found)
  self.assertGreater(found[0],.75)
  self.assertLess(abs(found[1][0]-332),10)
  self.assertLess(abs(found[1][1]-224),10)
