from vision import Vision
from pathlib import Path
import cv2,numpy as np,time
v=Vision('assets',Path('.cache-check'))
p=Path('C:/Users/Admin/AppData/Local/Temp/codex-clipboard-32ec81bf-eeb5-492d-ac78-04e098808bd2.png')
im=cv2.imdecode(np.fromfile(p,dtype=np.uint8),1)[28:]
for i in range(2):
    start=time.perf_counter(); o=v.analyze(im); print(i,'cached',v.last_cached,'seconds',round(time.perf_counter()-start,2),o.state,o.queue,o.capacity,flush=True)
    assert (o.queue,o.capacity)==(5,7)
assert v.last_cached
im2=cv2.imdecode(np.fromfile('live-fixtures/search-food.png',dtype=np.uint8),1)[31:]
for i in range(2):
    start=time.perf_counter(); o=v.analyze(im2); print('search',i,'cached',v.last_cached,'seconds',round(time.perf_counter()-start,2),o.level,flush=True)
    assert o.level==6
assert v.last_cached
