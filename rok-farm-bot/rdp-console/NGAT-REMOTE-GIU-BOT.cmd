@echo off
setlocal
set "ROK_HELPER_HOME=%~dp0"
title ROK Bot - Keep remote fullscreen v4
echo Run on YOUR VPS with game and bot open.
echo RDP will disconnect. Then ROK game or launcher will fit the desktop.
echo Console resolution: 1920x1080 only if supported by driver.
echo No passwords or security settings are changed.
echo.
powershell.exe -NoLogo -NoProfile -EncodedCommand JgAgACgAWwBzAGMAcgBpAHAAdABiAGwAbwBjAGsAXQA6ADoAQwByAGUAYQB0AGUAKABbAEkATwAuAEYAaQBsAGUAXQA6ADoAUgBlAGEAZABBAGwAbABUAGUAeAB0ACgAKABKAG8AaQBuAC0AUABhAHQAaAAgACQAZQBuAHYAOgBSAE8ASwBfAEgARQBMAFAARQBSAF8ASABPAE0ARQAgACcAQwBoAHUAeQBlAG4ALQBQAGgAaQBlAG4ALQBDAG8AbgBzAG8AbABlAC4AcABzADEAJwApACkAKQApAA==
if errorlevel 1 (
 echo Read ERROR above or keep-remote-result.log.
 pause
 exit /b 1
)
exit /b 0
