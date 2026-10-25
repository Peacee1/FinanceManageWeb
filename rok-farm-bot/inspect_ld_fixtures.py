from pathlib import Path
import cv2,numpy as np,json
from vision import Vision
v=Vision('assets')
root=Path('ldplayer-captures')
for p in root.glob('*.png'):
 s=cv2.imdecode(np.fromfile(p,dtype=np.uint8),1)[35:935,:1600]
 rows,_=v.engine(s)
 p.with_suffix('.json').write_text(json.dumps(rows or [],ensure_ascii=False),'utf-8')
 o=v.from_rows(s,rows or [])
 print(p.stem,o.state,o.level,o.queue,o.free,o.buttons,flush=True)
