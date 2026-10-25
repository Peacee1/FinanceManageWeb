from PIL import Image
from vision import Vision
import numpy as np,cv2
im=np.array(Image.open('C:/Users/Admin/AppData/Local/Temp/codex-clipboard-a4abfe72-e00e-4334-899a-ad592f46ae29.png').convert('RGB'))[31:749,1:959]
im=cv2.cvtColor(im,cv2.COLOR_RGB2BGR)
v=Vision('assets')
rows,_=v.engine(im)
print([(r[1],round(r[2],2)) for r in (rows or [])],flush=True)
print('gear',v.icon('settings_gear',im,(0,im.shape[0]*.65,im.shape[1]*.36,im.shape[0]*.35)),flush=True)
cv2.imwrite('resized-profile.png',im)
