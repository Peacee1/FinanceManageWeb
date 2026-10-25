import unittest,cv2
from vision import Vision
class SearchPriorityTests(unittest.TestCase):
 def test_actual_error_recognizes_search_and_not_deposit(self):
  v=Vision('assets');im=cv2.imread('live-fixtures/oct22-error.jpg');rows,_=v.engine(im)
  o=v.from_rows(im,rows or []);self.assertEqual(o.state,'search');self.assertTrue(o.buttons.get('find'))
  # A spurious gather label must not outrank exact Search on its button.
  box=[[510,465],[590,465],[590,495],[510,495]]
  o=v.from_rows(im,list(rows or [])+[(box,'Thu thap',.95)])
  self.assertEqual(o.state,'search');self.assertNotIn('gather',o.buttons)
 def test_low_confidence_plain_text_does_not_become_button(self):
  import numpy as np
  v=Vision.__new__(Vision);v.icons={}
  im=np.zeros((600,1000,3),np.uint8)
  o=v.from_rows(im,[([[400,400],[500,400],[500,430],[400,430]],'Tim kiem',.6)])
  self.assertFalse(o.buttons.get('find'))
