import unittest
from pathlib import Path
from unittest.mock import Mock
import cv2
from vision import Vision,march_panel,normalize

class MarchModalTests(unittest.TestCase):
 def test_small_vps_modal_overrides_map_when_action_text_missing(self):
  v=Vision('assets');im=cv2.imread(str(Path(__file__).parent/'live-fixtures/march-small-vps.png'))
  rows,_=v.engine(im)
  rows=[r for r in rows if normalize(r[1])!='hanhquan']
  self.assertTrue(march_panel(im,rows))
  h,w=im.shape[:2]
  crop=im[int(h*.40):int(h*.90),int(w*.25):int(w*.85)]
  enlarged,_=v.engine(cv2.resize(crop,None,fx=2,fy=2))
  v.icon=Mock(return_value=(.95,(700,400)))
  o=v.from_rows(im,rows)
  self.assertEqual(o.state,'march');self.assertFalse(o.buttons.get('march'))
  v.engine=Mock(side_effect=[(rows,None),([],None)])
  v.cache={};v.cache_file=None
  self.assertEqual(v.analyze(im).state,'march')
  v.engine=Mock(side_effect=[(rows,None),(enlarged,None)])
  recovered=v.analyze(im)
  self.assertEqual(recovered.state,'march');self.assertTrue(recovered.buttons.get('march'))
 def test_header_alone_is_not_march_modal(self):
  v=Vision.__new__(Vision);v.icons={}
  import numpy as np
  im=np.zeros((600,1000,3),np.uint8)
  rows=[([[400,100],[500,100],[500,120],[400,120]],'Quan moi',.99)]
  self.assertFalse(march_panel(im,rows))
