"""Local image benchmark; never controls game or connects to fleet."""
from pathlib import Path
import time,json,statistics
import cv2
from vision import Vision

root=Path(__file__).parent
vision=Vision(root/'assets')
files=['resized-profile.png','live-fixtures/vps-account-button-error.jpg','live-fixtures/search-food.png','live-fixtures/network-disconnected.png','live-fixtures/other-device-login.png']
results=[]
for name in files:
    image=cv2.imread(str(root/name));measurements={}
    for angle in (True,False):
        elapsed=[];rows=[]
        for _ in range(2):
            start=time.perf_counter();rows,_=vision.engine(image,use_cls=angle);elapsed.append(time.perf_counter()-start)
        measurements['angle_on' if angle else 'angle_off']={'seconds':round(statistics.median(elapsed),3),'text_count':len(rows or [])}
    if name=='resized-profile.png':
        h,w=image.shape[:2];crop=image[int(h*.21):int(h*.36),:int(w*.30)]
        start=time.perf_counter();rows,_=vision.engine(crop,use_cls=False)
        measurements['name_crop']={'seconds':round(time.perf_counter()-start,3),'texts':[t for _,t,c in rows or [] if c>=.5]}
    results.append({'file':name,**measurements})
    print(json.dumps(results[-1],ensure_ascii=False),flush=True)
(root/'ocr-v41-benchmark.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
