using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.IO;

public static class RokConsoleDisplay {
    [StructLayout(LayoutKind.Explicit, Size=220)]
    public struct Mode {
        [FieldOffset(68)] public ushort size;
        [FieldOffset(72)] public uint fields;
        [FieldOffset(168)] public uint bits;
        [FieldOffset(172)] public uint width;
        [FieldOffset(176)] public uint height;
        [FieldOffset(184)] public uint frequency;
    }
    public delegate bool EnumProc(IntPtr hwnd, IntPtr parameter);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool EnumDisplaySettings(string device, int index, ref Mode mode);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int ChangeDisplaySettings(ref Mode mode, uint flags);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr parameter);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int size);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left,top,right,bottom; }
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint action,uint param,out Rect rect,uint flags);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int width,int height,uint flags);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);

    public static string EnsureHD() {
        Mode current=new Mode();current.size=220;
        if(!EnumDisplaySettings(null,-1,ref current)) return "Cannot read console display mode; no resolution changed.";
        string before=current.width+"x"+current.height;
        if(current.width>=1920 && current.height>=1080) return "Console resolution already "+before;
        for(int i=0;i<1000;i++) {
            Mode mode=new Mode();mode.size=220;
            if(!EnumDisplaySettings(null,i,ref mode)) break;
            if(mode.width!=1920 || mode.height!=1080 || mode.bits<24) continue;
            // Only use a driver-enumerated mode, test before applying.
            // No UPDATEREGISTRY: does not persist a display mode to registry.
            if(ChangeDisplaySettings(ref mode,2)!=0) continue;
            int result=ChangeDisplaySettings(ref mode,0);
            return "Console display "+before+" -> 1920x1080; result="+result;
        }
        return "Console display "+before+"; driver does not offer 1920x1080. Game will still be maximized.";
    }
    public static string MaximizeGame() {
        int session=Process.GetCurrentProcess().SessionId;
        IntPtr game=IntPtr.Zero,launcher=IntPtr.Zero;int count=0,launcherCount=0;
        EnumProc callback=delegate(IntPtr hwnd,IntPtr unused) {
            if(!IsWindowVisible(hwnd)) return true;
            StringBuilder text=new StringBuilder(512);GetWindowText(hwnd,text,text.Capacity);
            string title=text.ToString();
            uint pid;GetWindowThreadProcessId(hwnd,out pid);
            try {
                Process process=Process.GetProcessById((int)pid);
                if(process.SessionId!=session) return true;
                if(title=="Rise of Kingdoms" || title=="万国觉醒") {game=hwnd;count++;}
                else {
                    string path=process.MainModule.FileName;
                    string file=Path.GetFileName(path),directory=Path.GetFileName(Path.GetDirectoryName(path));
                    if((file.Equals("launcher.exe",StringComparison.OrdinalIgnoreCase)||file.Equals("ROKLauncher.exe",StringComparison.OrdinalIgnoreCase)) &&
                       directory.Equals("ROKLauncher",StringComparison.OrdinalIgnoreCase)) {launcher=hwnd;launcherCount++;}
                }
            } catch {return true;}
            return true;
        };
        EnumWindows(callback,IntPtr.Zero);
        string kind="Game";
        if(count==0 && launcherCount==1) {game=launcher;kind="ROK launcher";}
        else if(count!=1) return "Expected one ROK game or unique ROK launcher in YOUR session; games="+count+", launchers="+launcherCount+". No window changed.";
        Rect area;
        if(!SystemParametersInfo(48,0,out area,0)) return "Cannot read desktop work area; no window changed.";
        int width=area.right-area.left,height=area.bottom-area.top;
        if(width<640 || height<480) return "Desktop work area too small: "+width+"x"+height+". Ask provider about console display support.";
        ShowWindow(game,9);
        bool placed=SetWindowPos(game,IntPtr.Zero,area.left,area.top,width,height,4);
        ShowWindow(game,3);SetForegroundWindow(game);
        Rect actual;GetWindowRect(game,out actual);
        return kind+" fitted to desktop; placed="+placed+"; maximized="+IsZoomed(game)+"; bounds="+actual.left+","+actual.top+","+(actual.right-actual.left)+"x"+(actual.bottom-actual.top)+"; work area="+width+"x"+height;
    }
}
