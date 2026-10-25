from rapidocr_onnxruntime import RapidOCR
from pathlib import Path
import json
engine=RapidOCR(intra_op_num_threads=4,inter_op_num_threads=1)
files=['e8bc6feb-d9bd-41e2-9249-5065963405e0','1dfcaaf7-5208-4ee9-8de7-a651767d6dd2','fbf1b59f-8a7e-4312-aa43-176c46ecc752','53fc3c61-2dfe-45b3-81a5-f8acc3c1b67b','151a6976-f1bb-4d67-8385-f27e5af56681','3c3024e9-6329-4bc2-a181-8915607fde18']
output={}
for key in files:
    rows,times=engine(str(Path('C:/Users/Admin/AppData/Local/Temp')/('codex-clipboard-'+key+'.png')))
    output[key]=rows
    print(key, [(r[1],round(r[2],2)) for r in (rows or [])], flush=True)
Path('ocr-probe.json').write_text(json.dumps(output,ensure_ascii=False),encoding='utf-8')
