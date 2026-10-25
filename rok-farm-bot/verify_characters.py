from pathlib import Path
import cv2,numpy as np,json
from characters import extract_stars
from vision import Vision
rows=json.loads(Path('characters-ocr.json').read_text('utf-8'))
key='9381265b-e51c-4f96-96f6-d950a7c50a33'
im=cv2.imdecode(np.fromfile(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+key+'.png'),dtype=np.uint8),1)
chars,normal,known=extract_stars(rows[key],im.shape)
print([(c.identity,c.name,c.point) for c in chars],flush=True)
assert len(chars)==7 and normal and known
assert not any('f4' in c.identity for c in chars)
v=Vision('assets')
for fname,icon,region in [('1427aa2b-3332-4c73-b9b3-607cffbf2f86','settings_gear',(0,650,640,344)),('9381265b-e51c-4f96-96f6-d950a7c50a33','character_active',(450,300,80,80)),('8fba1804-e5c4-4cb9-a9b5-c761617fbff7','confirm_yes',(850,570,400,150))]:
    screen=cv2.imdecode(np.fromfile(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+fname+'.png'),dtype=np.uint8),1)
    found=v.icon(icon,screen,region)
    print(icon,found,flush=True)
    assert found,icon
for fname in ['e916b0e5-8d31-466f-9d71-e76c2737a387','53c5c4d6-d61a-4e98-8c83-35245320d811','50f6b892-7524-4566-afae-a24e3856a753']:
    words,_=v.engine(str(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+fname+'.png')))
    rows[fname]=words
    print(fname,[(r[1],round(r[2],2)) for r in (words or [])],flush=True)
Path('characters-ocr.json').write_text(json.dumps(rows,ensure_ascii=False),'utf-8')
