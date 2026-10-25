"""Offline packaged OCR check; no screen capture, input, or server connection."""
import json
import time
from pathlib import Path


def check_ocr(assets, root):
    report = {'ok': False, 'stage': 'import', 'seconds': 0}
    started = time.monotonic()
    try:
        import numpy as np
        import onnxruntime
        from vision import Vision
        report['onnxruntime'] = onnxruntime.__version__
        report['stage'] = 'initialize'
        vision = Vision(assets)
        report['stage'] = 'inference'
        vision.engine(np.zeros((160, 320, 3), dtype=np.uint8))
        report.update(ok=True, stage='ready')
    except Exception as error:
        report.update(error=type(error).__name__, message=str(error)[:1500])
    finally:
        report['seconds'] = round(time.monotonic()-started, 2)
        output = Path(root)/'ocr-startup-check.json'
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    return 0 if report['ok'] else 1

def check_https(root):
    report = {'ok': False}
    try:
        import urllib.request
        with urllib.request.urlopen('https://rokbot.peacee1.io.vn', timeout=15) as response:
            report.update(ok=response.status == 200, status=response.status)
    except Exception as error:
        report.update(error=type(error).__name__, message=str(error)[:1000])
    output = Path(root)/'https-startup-check.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    return 0 if report['ok'] else 1
