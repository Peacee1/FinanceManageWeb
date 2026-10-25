from pathlib import Path
import hashlib
import zipfile
import sys
import json

root=Path(__file__).parent
dist=root/'dist'
helper=root/'rdp-console'
version=sys.argv[1] if len(sys.argv)>1 else '35'
assert version.isdigit()
exe=dist/('ROKFarmBotFleet_v'+version+'.exe')
guide=(root/'docs'/'PC-HUONG-DAN.md').read_text(encoding='utf-8-sig')
guide+='''

## Ngắt remote và giữ game phóng to — Keep Remote v4
Gói này có sẵn Keep Remote v4. Giải nén toàn bộ các file vào cùng một thư mục trên VPS.
Giữ game và bot mở. Khi muốn rời VPS, nhấp phải NGAT-REMOTE-GIU-BOT.cmd → Run as administrator.
Remote sẽ ngắt; tiện ích chờ chuyển phiên rồi phóng to tối đa cửa sổ game và thử độ phân giải 1920×1080 nếu driver hỗ trợ.
Sau khoảng 30 giây, dùng trang quản trị kiểm tra ảnh chụp mới và nhật ký.
Nếu còn bị nhỏ, xem keep-remote-result.log trong thư mục giải nén.
Đọc thêm HUONG-DAN-NGAT-REMOTE.md. Không tách file CMD khỏi các file PS1 và CS đi kèm.
'''
output=dist/('ROKBot-PC-v'+version+'.zip')
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    z.write(exe,exe.name)
    z.writestr('HUONG-DAN.md',guide)
    for name in ('NGAT-REMOTE-GIU-BOT.cmd','Chuyen-Phien-Console.ps1','ConsoleDisplay.cs','HUONG-DAN.md'):
        z.write(helper/name,'HUONG-DAN-NGAT-REMOTE.md' if name=='HUONG-DAN.md' else name)
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(set(z.namelist()))
    assert hashlib.sha256(z.read(exe.name)).digest()==hashlib.sha256(exe.read_bytes()).digest()
    assert z.read('NGAT-REMOTE-GIU-BOT.cmd')==(helper/'NGAT-REMOTE-GIU-BOT.cmd').read_bytes()
    assert 'fullscreen v4' in z.read('NGAT-REMOTE-GIU-BOT.cmd').decode('ascii')
    manifest=dist/'PHIEN-BAN.json'
    if manifest.exists():
        data=json.loads(manifest.read_text(encoding='utf-8-sig'))
        row=next(item for item in data if item['platform']=='PC')
        row.update(version='v'+version,executable=exe.name,zip=output.name,bytes=exe.stat().st_size,sha256=hashlib.sha256(exe.read_bytes()).hexdigest())
        manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Verified PC v'+version+' EXE + Keep Remote v4; ZIP integrity and EXE hash OK.')
    print(output)
