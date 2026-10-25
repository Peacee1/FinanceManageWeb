# Source for the CMD launcher. Queries only the current process session.
$ErrorActionPreference = 'Stop'
$rokLog = Join-Path $env:ROK_HELPER_HOME 'keep-remote-result.log'
function Write-RokResult($text) {
    Write-Host $text
    Add-Content -LiteralPath $rokLog -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $text)
}
try {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'Right-click NGAT-REMOTE-GIU-BOT.cmd and select Run as administrator.'
        exit 1
    }
    $rokSession = (Get-Process -Id $PID).SessionId
    if ($rokSession -le 0) { throw 'Not an interactive user session.' }
    Add-Type -Path (Join-Path $env:ROK_HELPER_HOME 'ConsoleDisplay.cs')
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RokSessionProtocol {
    [DllImport("wtsapi32.dll", SetLastError=true)]
    public static extern bool WTSQuerySessionInformation(IntPtr server, int session, int info, out IntPtr buffer, out int bytes);
    [DllImport("wtsapi32.dll")]
    public static extern void WTSFreeMemory(IntPtr buffer);
}
'@
    $rokBuffer = [IntPtr]::Zero
    $rokBytes = 0
    $rokProtocol = -1
    try {
        # WTSClientProtocolType = 16; 0 = console, 2 = RDP.
        if (-not [RokSessionProtocol]::WTSQuerySessionInformation([IntPtr]::Zero, $rokSession, 16, [ref]$rokBuffer, [ref]$rokBytes)) {
            throw ('Cannot query current session; Win32 error ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
        }
        if ($rokBytes -lt 2 -or $rokBuffer -eq [IntPtr]::Zero) { throw 'Invalid session protocol response.' }
        $rokProtocol = [Runtime.InteropServices.Marshal]::ReadInt16($rokBuffer)
    } finally {
        if ($rokBuffer -ne [IntPtr]::Zero) { [RokSessionProtocol]::WTSFreeMemory($rokBuffer) }
    }
    Write-Host ('Current session ID: ' + $rokSession + '; protocol: ' + $rokProtocol)
    if ($rokProtocol -eq 0) {
        foreach ($rokDelay in @(0,2,3,5,10)) {
            Start-Sleep -Seconds $rokDelay
            Write-RokResult ([RokConsoleDisplay]::EnsureHD())
            Write-RokResult ([RokConsoleDisplay]::MaximizeGame())
        }
        exit 0
    }
    if ($rokProtocol -ne 2) { throw 'Current session is not RDP. No transfer attempted.' }
    Write-Host 'Transferring YOUR current session to console. RDP will disconnect.'
    & ($env:SystemRoot + '\System32\tscon.exe') $rokSession /dest:console
    if ($LASTEXITCODE -ne 0) { throw ('tscon failed with exit code ' + $LASTEXITCODE + '. Ask the VPS provider about console support.') }
    # Console display is recreated asynchronously after tscon disconnects RDP.
    foreach ($rokDelay in @(2,3,5,10)) {
        Start-Sleep -Seconds $rokDelay
        Write-RokResult ([RokConsoleDisplay]::EnsureHD())
        Write-RokResult ([RokConsoleDisplay]::MaximizeGame())
    }
    exit 0
} catch {
    Write-RokResult ('ERROR: ' + $_.Exception.Message)
    exit 1
}
