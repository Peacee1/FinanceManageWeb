from pathlib import Path
from PIL import Image, ImageDraw
assets=Path('assets');assets.mkdir(exist_ok=True)
tmp=Path('C:/Users/Admin/AppData/Local/Temp')
items={'minus':('e8bc6feb-d9bd-41e2-9249-5065963405e0',(548,698,574,722)), 'plus':('e8bc6feb-d9bd-41e2-9249-5065963405e0',(819,698,845,724)), 'inside':('3c3024e9-6329-4bc2-a181-8915607fde18',(1675,910,1725,950)), 'outside':('151a6976-f1bb-4d67-8385-f27e5af56681',(1680,908,1730,950)), 'open_search':('151a6976-f1bb-4d67-8385-f27e5af56681',(410,6,432,29))}
montage=Image.new('RGB',(600,150),'#222222');draw=ImageDraw.Draw(montage)
for i,(name,(file,rect)) in enumerate(items.items()):
    icon=Image.open(tmp/('codex-clipboard-'+file+'.png')).crop(rect)
    icon.save(assets/(name+'.png'))
    montage.paste(icon.resize((100,80)),(i*120,30));draw.text((i*120,5),name,fill='white')
montage.save('assets-preview.png')
