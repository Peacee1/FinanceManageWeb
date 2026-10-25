import sys,json,cv2,numpy as np
sys.argv.append('--ldplayer')
from vision import Vision
from characters import CharacterNavigator,extract_stars
from types import SimpleNamespace
v=Vision('assets')
for name in ['inside','outside','search-wood','deposit','queue','march','characters']:
 s=cv2.imdecode(np.fromfile('ldplayer-captures/'+name+'.png',dtype=np.uint8),1)[35:935,:1600]
 rows=json.load(open('ldplayer-captures/'+name+'.json',encoding='utf-8'))
 o=v.from_rows(s,rows);print(name,o.state,o.level,o.queue,o.free,o.buttons,flush=True)
 if name=='characters':
  nav=CharacterNavigator(SimpleNamespace(vision=v));nav.inspect=lambda:('characters',s,(0,0),rows,[])
  print([(c.name,c.active,c.power) for c in nav.page()[0]],flush=True)
