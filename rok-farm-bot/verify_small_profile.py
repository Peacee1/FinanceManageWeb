from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
import threading
import cv2,numpy as np
from vision import Vision
from characters import CharacterNavigator
v=Vision('assets')
image=cv2.imdecode(np.fromfile('resized-profile.png',dtype=np.uint8),1)
rows,_=v.engine(image)
app=SimpleNamespace(vision=v,stop=threading.Event(),active=lambda:True,snapshot=lambda:(image,(1,31)))
nav=CharacterNavigator(app)
state,*_=nav.inspect()
print('small window state',state,flush=True)
assert state=='profile'
found=v.icon('settings_gear',image,(0,image.shape[0]*.65,image.shape[1]*.36,image.shape[0]*.35))
assert found and 220<found[1][0]<250 and 640<found[1][1]<670
print('small window gear',found,flush=True)
