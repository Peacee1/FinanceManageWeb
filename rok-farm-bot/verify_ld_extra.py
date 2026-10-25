import sys,json,cv2,numpy as np
sys.argv.append('--ldplayer')
from vision import Vision
from resource_stock import read_stock
v=Vision('assets')
s=cv2.imdecode(np.fromfile('ldplayer-captures/inside.png',dtype=np.uint8),1)[35:935,:1600]
print('stock',read_stock(s,v),flush=True)
for name in ['characters-bottom','confirm-character']:
 s=cv2.imdecode(np.fromfile('ldplayer-captures/'+name+'.png',dtype=np.uint8),1)[35:935,:1600]
 rows,_=v.engine(s)
 open('ldplayer-captures/'+name+'.json','w',encoding='utf-8').write(json.dumps(rows,ensure_ascii=False))
 print(name,[(t,round(c,2)) for b,t,c in rows],flush=True)
