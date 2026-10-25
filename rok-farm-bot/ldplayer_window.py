"""Use LDPlayer's documented list2 top and bound window handles."""
import csv,json,os,subprocess,ctypes
from ctypes import wintypes
from pathlib import Path
from game_window import GameWindow,user32

CONFIG_DIR=Path(os.environ.get('LOCALAPPDATA',str(Path.home())))/'ROKFarmBotLDPlayer'
CONFIG_FILE=CONFIG_DIR/'ldplayer.json'

def parse_instances(output):
    result=[]
    for row in csv.reader(output.splitlines()):
        if len(row)<7:continue
        try:
            index,top,bound,started,pid=int(row[0]),int(row[2]),int(row[3]),int(row[4]),int(row[5])
        except ValueError:continue
        if started==1 and top>0 and bound>0:result.append({'index':index,'name':row[1],'top':top,'bound':bound,'pid':pid})
    return result

def list_instances(console):
    path=Path(console)
    if path.name.lower() not in {'ldconsole.exe','dnconsole.exe'} or not path.is_file():
        raise RuntimeError('Chọn ldconsole.exe hoặc dnconsole.exe trong thư mục cài LDPlayer.')
    run=subprocess.run([str(path),'list2'],capture_output=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
    if run.returncode:raise RuntimeError('Không đọc được danh sách LDPlayer.')
    return parse_instances(run.stdout.decode('utf-8',errors='replace'))

def save_instance(console,index):
    CONFIG_DIR.mkdir(parents=True,exist_ok=True)
    CONFIG_FILE.write_text(json.dumps({'console':str(Path(console).resolve()),'index':int(index)}),'utf-8')

def running_console_paths():
    """Find the console next to running LDPlayer executables, on any drive."""
    class ProcessEntry(ctypes.Structure):
        _fields_=[('dwSize',wintypes.DWORD),('cntUsage',wintypes.DWORD),
                  ('th32ProcessID',wintypes.DWORD),('th32DefaultHeapID',ctypes.c_size_t),
                  ('th32ModuleID',wintypes.DWORD),('cntThreads',wintypes.DWORD),
                  ('th32ParentProcessID',wintypes.DWORD),('pcPriClassBase',wintypes.LONG),
                  ('dwFlags',wintypes.DWORD),('szExeFile',wintypes.WCHAR*260)]
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.CreateToolhelp32Snapshot.argtypes=[wintypes.DWORD,wintypes.DWORD]
    kernel.CreateToolhelp32Snapshot.restype=wintypes.HANDLE
    kernel.Process32FirstW.argtypes=[wintypes.HANDLE,ctypes.POINTER(ProcessEntry)]
    kernel.Process32NextW.argtypes=[wintypes.HANDLE,ctypes.POINTER(ProcessEntry)]
    kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD]
    kernel.OpenProcess.restype=wintypes.HANDLE
    kernel.QueryFullProcessImageNameW.argtypes=[wintypes.HANDLE,wintypes.DWORD,wintypes.LPWSTR,ctypes.POINTER(wintypes.DWORD)]
    kernel.CloseHandle.argtypes=[wintypes.HANDLE]
    snapshot=kernel.CreateToolhelp32Snapshot(2,0)
    if snapshot in (None,ctypes.c_void_p(-1).value):return []
    result={}
    try:
        entry=ProcessEntry();entry.dwSize=ctypes.sizeof(entry)
        more=kernel.Process32FirstW(snapshot,ctypes.byref(entry))
        while more:
            if entry.szExeFile.lower() in {'dnplayer.exe','ldplayer.exe'}:
                handle=kernel.OpenProcess(0x1000,False,entry.th32ProcessID)
                if handle:
                    try:
                        size=wintypes.DWORD(32768);path=ctypes.create_unicode_buffer(size.value)
                        if kernel.QueryFullProcessImageNameW(handle,0,path,ctypes.byref(size)):
                            for name in ('ldconsole.exe','dnconsole.exe'):
                                console=Path(path.value).parent/name
                                if console.is_file():result[str(console.resolve()).lower()]=str(console.resolve())
                    finally:kernel.CloseHandle(handle)
            more=kernel.Process32NextW(snapshot,ctypes.byref(entry))
    finally:kernel.CloseHandle(snapshot)
    return list(result.values())

def discover_instance():
    found={}
    for console in running_console_paths():
        try:instances=list_instances(console)
        except (OSError,RuntimeError,subprocess.TimeoutExpired):continue
        for instance in instances:
            if user32.IsWindowVisible(instance['top']) and user32.IsWindowVisible(instance['bound']):
                found[(instance['top'],instance['bound'])]=(console,instance)
    if not found:raise RuntimeError('Chưa tìm thấy LDPlayer đang mở. Mở LDPlayer và game ROK trước; có thể chọn thủ công trong tool.')
    if len(found)>1:raise RuntimeError('Có nhiều cửa sổ LDPlayer đang mở. Chọn đúng instance trong tool hoặc chỉ mở một cửa sổ.')
    console,instance=next(iter(found.values()))
    save_instance(console,instance['index'])
    return instance

class LDPlayerWindow(GameWindow):
    @classmethod
    def find(cls):
        instance=None
        try:
            settings=json.loads(CONFIG_FILE.read_text('utf-8'))
            matches=[i for i in list_instances(settings['console']) if i['index']==settings['index']]
            if len(matches)==1:instance=matches[0]
        except (OSError,ValueError,KeyError,TypeError,RuntimeError,subprocess.TimeoutExpired):pass
        if instance is None:instance=discover_instance()
        if not user32.IsWindowVisible(instance['top']) or not user32.IsWindowVisible(instance['bound']):
            raise RuntimeError('Không thấy vùng Android của LDPlayer đã chọn.')
        window=cls(instance['top']);window.capture_hwnd=instance['bound'];window.instance=instance
        return window
