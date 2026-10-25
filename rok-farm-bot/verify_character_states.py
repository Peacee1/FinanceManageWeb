from pathlib import Path
import cv2,numpy as np,json,threading
from types import SimpleNamespace
from vision import Vision
from characters import CharacterNavigator
v=Vision('assets')
data=json.loads(Path('characters-ocr.json').read_text('utf-8'))
expected={'1427aa2b-3332-4c73-b9b3-607cffbf2f86':'profile','9e415660-6e11-4570-96fe-b264b75b462c':'settings','9381265b-e51c-4f96-96f6-d950a7c50a33':'characters','8fba1804-e5c4-4cb9-a9b5-c761617fbff7':'confirm_character','e916b0e5-8d31-466f-9d71-e76c2737a387':'alliance','53c5c4d6-d61a-4e98-8c83-35245320d811':'no_alliance','50f6b892-7524-4566-afae-a24e3856a753':'territory'}
for file,state in expected.items():
    image=cv2.imdecode(np.fromfile(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+file+'.png'),dtype=np.uint8),1)
    saved_engine=v.engine
    v.engine=lambda image: (data[file],None)
    app=SimpleNamespace(vision=v,stop=threading.Event(),active=lambda:True,snapshot=lambda:(image,(0,0)))
    nav=CharacterNavigator(app)
    actual,screen,offset,rows,texts=nav.inspect()
    print(file,actual,flush=True)
    assert actual==state
    if state=='characters':
        chars,normal,*_=nav.page()
        assert len(chars)==7 and sum(c.active for c in chars)==1 and any(c.name=='Peacee1 Do' for c in chars)
    if state=='alliance':
        assert nav.text_point(texts,'lanhtho',screen,lambda p:p[0]>screen.shape[1]*.4)
    if state=='territory':
        assert nav.text_point(texts,'nhan',screen,lambda p:p[0]>screen.shape[1]*.55 and p[1]<screen.shape[0]*.38)
    v.engine=saved_engine
print('Character and alliance image checks: OK',flush=True)
