from pathlib import Path
from rapidocr_onnxruntime import RapidOCR
import json
v=RapidOCR(intra_op_num_threads=4,inter_op_num_threads=1)
ids=['1427aa2b-3332-4c73-b9b3-607cffbf2f86','9e415660-6e11-4570-96fe-b264b75b462c','9381265b-e51c-4f96-96f6-d950a7c50a33','8fba1804-e5c4-4cb9-a9b5-c761617fbff7']
output={}
for key in ids:
    rows,_=v(str(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+key+'.png')))
    output[key]=rows or []
    print(key, [(r[1],round(r[2],2)) for r in (rows or [])],flush=True)
Path('characters-ocr.json').write_text(json.dumps(output,ensure_ascii=False),'utf-8')
