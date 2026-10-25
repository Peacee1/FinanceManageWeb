from pathlib import Path
import cv2,numpy as np
from vision import Vision
v=Vision('assets')
for name,expected in [('inside','inside'),('outside','outside'),('search-barbarian','search'),('search-food','search')]:
    im=cv2.imdecode(np.fromfile(Path('live-fixtures')/(name+'.png'),dtype=np.uint8),cv2.IMREAD_COLOR)
    # Window samples have a 31 pixel title bar. Production captures the client.
    result=v.analyze(im[31:])
    print(name,result.state,result.buttons,'queue',result.queue,'capacity',result.capacity,'level',result.level,flush=True)
    assert result.state==expected,(name,result.state)
    if name=='search-food':
        assert result.level==6 and all(k in result.buttons for k in ['food','wood','stone','gold','minus','plus','find'])
    if name=='outside':
        assert result.queue==3 and result.capacity==4
print('Live game recognition checks: OK',flush=True)
