from pathlib import Path
import cv2,numpy as np
from vision import Vision
v=Vision(Path('assets'))
p=Path('C:/Users/Admin/AppData/Local/Temp')/'codex-clipboard-e8bc6feb-d9bd-41e2-9249-5065963405e0.png'
screen=cv2.imdecode(np.fromfile(p,dtype=np.uint8),cv2.IMREAD_COLOR)
shifted=screen.copy(); shifted[598:828,528:864]=(90,130,90); shifted[598:828,708:1044]=screen[598:828,528:864]
a=v.analyze(shifted)
assert a.state=='search' and a.level==8
assert abs(a.buttons['find'][0]-877)<8
assert abs(a.buttons['minus'][0]-741)<8 and abs(a.buttons['plus'][0]-1012)<8
print('Neural OCR and icons on shifted panel: OK',a.buttons,flush=True)
small=cv2.resize(screen,None,fx=.8,fy=.8)
b=v.analyze(small)
assert b.state=='search' and b.level==8
assert 'minus' in b.buttons and 'plus' in b.buttons
print('Neural OCR and icons at 80 percent scale: OK',b.buttons,flush=True)
