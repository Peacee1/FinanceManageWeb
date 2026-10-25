"""Create the RDP console helper bundle without running any session action."""
import base64
from pathlib import Path
import zipfile

root=Path(__file__).parent
folder=root/'rdp-console'
bootstrap="& ([scriptblock]::Create([IO.File]::ReadAllText((Join-Path $env:ROK_HELPER_HOME 'Chuyen-Phien-Console.ps1'))))"
payload=base64.b64encode(bootstrap.encode('utf-16le')).decode()
launcher='''@echo off
setlocal
set "ROK_HELPER_HOME=%~dp0"
title ROK Bot - Keep remote fullscreen v3
echo Run on YOUR VPS with game and bot open.
echo RDP will disconnect. Then ROK will maximize automatically.
echo Console resolution: 1920x1080 only if supported by driver.
echo No passwords or security settings are changed.
echo.
powershell.exe -NoLogo -NoProfile -EncodedCommand PAYLOAD
if errorlevel 1 (
 echo Read ERROR above or keep-remote-result.log.
 pause
 exit /b 1
)
exit /b 0
'''.replace('PAYLOAD',payload)
assert max(map(len,launcher.splitlines()))<8191
(folder/'NGAT-REMOTE-GIU-BOT.cmd').write_text(launcher,encoding='ascii')
output=root/'dist/ROKBot-Giu-Desktop-VPS-v3.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as bundle:
    for name in ('NGAT-REMOTE-GIU-BOT.cmd','Chuyen-Phien-Console.ps1','ConsoleDisplay.cs','HUONG-DAN.md'):
        bundle.write(folder/name,name)
with zipfile.ZipFile(output) as bundle:
    assert bundle.testzip() is None
print(output)
