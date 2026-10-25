from pathlib import Path
import cv2,numpy as np
root=Path('ldplayer-captures'); dest=Path('assets/ldplayer');dest.mkdir(exist_ok=True)
def crop(name,source,rect):
 im=cv2.imdecode(np.fromfile(root/(source+'.png'),dtype=np.uint8),1)
 x,y,w,h=rect;patch=im[y:y+h,x:x+w]
 # Store at the same nominal 1770x994 scale as the matcher.
 patch=cv2.resize(patch,None,fx=1770/1600,fy=994/900)
 cv2.imencode('.png',patch)[1].tofile(dest/(name+'.png'))
crop('inside','inside',(38,815,86,72));crop('outside','outside',(38,815,86,72))
crop('open_search','outside',(44,680,64,60))
crop('character_active','characters',(803,379,40,40))
crop('settings_gear','profile',(1322,741,76,68))
crop('alliance_flag','alliance',(978,478,103,112))
crop('confirm_yes','confirm-character',(965,646,110,53))
for name,x in [('food',502),('wood',745),('stone',985),('gold',1226)]:crop('resource_'+name,'search-wood',(x,773,110,97))
crop('minus','search-wood',(609,540,35,36));crop('plus','search-wood',(961,540,34,36))
