from vision import Vision
from pathlib import Path
import cv2,numpy as np,json
v=Vision.__new__(Vision);v.icons={p.stem:cv2.imdecode(np.fromfile(p,dtype=np.uint8),cv2.IMREAD_COLOR) for p in Path('assets').glob('*.png')}
rows=json.loads(Path('ocr-probe.json').read_text('utf-8'))
for file,words in rows.items():
    im=cv2.imdecode(np.fromfile(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+file+'.png'),dtype=np.uint8),cv2.IMREAD_COLOR)
    obs=v.from_rows(im,words)
    print(file,obs.state,obs.buttons,'queue',obs.queue,'level',obs.level,'free',obs.free)
