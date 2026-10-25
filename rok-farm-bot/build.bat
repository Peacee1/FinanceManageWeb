@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt pyinstaller
if errorlevel 1 exit /b 1
rem RapidOCR pulls desktop OpenCV. Replace it with the server-safe variant.
.venv\Scripts\python.exe -m pip uninstall -y opencv-python
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -m pip install --no-deps --force-reinstall opencv-python-headless==5.0.0.93
if errorlevel 1 exit /b 1
if /I "%~1"=="PC" goto pc
if /I "%~1"=="LD" goto ld
if /I "%~1"=="OFFLINE" goto offline
echo Usage: build.bat PC ^| LD ^| OFFLINE
exit /b 0
:pc
.venv\Scripts\python.exe -m PyInstaller --noconfirm ROKFarmBotFleet_v50.spec
exit /b %errorlevel%
:ld
.venv\Scripts\python.exe -m PyInstaller --noconfirm ROKFarmBotLDPlayer_v18.spec
exit /b %errorlevel%
:offline
.venv\Scripts\python.exe -m PyInstaller --noconfirm ROKFarmBotPCOffline_v1.spec
exit /b %errorlevel%
pause








