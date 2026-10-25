"""Restore the already installed PC ROK through its visible launcher."""
import ctypes,time,sys
from ctypes import wintypes
from pathlib import PureWindowsPath
import numpy as np
import pyautogui as pg
from game_window import GameWindow,user32
from vision import normalize,Vision

def is_rok_launcher(path,title):
    path=PureWindowsPath(path)
    if path.name.lower() not in {'launcher.exe','roklauncher.exe'}:return False
    parts=normalize(str(path.parent))
    return ('roklauncher' in parts or 'riseofkingdoms' in parts or
            path.name.lower()=='roklauncher.exe' or normalize(title).startswith('riseofkingdoms'))

def process_path(hwnd):
    pid=wintypes.DWORD();user32.GetWindowThreadProcessId(hwnd,ctypes.byref(pid))
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];kernel.OpenProcess.restype=wintypes.HANDLE
    kernel.QueryFullProcessImageNameW.argtypes=[wintypes.HANDLE,wintypes.DWORD,wintypes.LPWSTR,ctypes.POINTER(wintypes.DWORD)]
    kernel.CloseHandle.argtypes=[wintypes.HANDLE]
    handle=kernel.OpenProcess(0x1000,False,pid.value)
    if not handle:return ''
    try:
        size=wintypes.DWORD(32768);path=ctypes.create_unicode_buffer(size.value)
        return path.value if kernel.QueryFullProcessImageNameW(handle,0,path,ctypes.byref(size)) else ''
    finally:kernel.CloseHandle(handle)

def window_identity(window):
    pid=wintypes.DWORD();user32.GetWindowThreadProcessId(window.hwnd,ctypes.byref(pid))
    return window.hwnd,pid.value

class LauncherWindow(GameWindow):
    @classmethod
    def find(cls):
        found=[]
        callback_type=ctypes.WINFUNCTYPE(wintypes.BOOL,wintypes.HWND,wintypes.LPARAM)
        def callback(hwnd,_):
            if not user32.IsWindowVisible(hwnd):return True
            title=ctypes.create_unicode_buffer(512);user32.GetWindowTextW(hwnd,title,len(title))
            if title.value and is_rok_launcher(process_path(hwnd),title.value):found.append(hwnd)
            return True
        user32.EnumWindows(callback_type(callback),0)
        if len(found)!=1:raise RuntimeError('Chưa tìm thấy duy nhất launcher ROK đang mở; giữ launcher mở để bot bấm Bắt đầu.')
        return cls(found[0])

def launcher_start_point(screen,rows):
    h,w=screen.shape[:2];points=[]
    for box,text,confidence in rows or []:
        point=tuple(map(int,np.mean(box,axis=0)))
        if (confidence>=.50 and normalize(text) in {'batdau','vaogame','start','startgame'}
            and point[0]>w*.65 and point[1]>h*.65 and Vision.colored_button(screen,box)):
            if not any(abs(point[0]-p[0])<12 and abs(point[1]-p[1])<12 for p in points):points.append(point)
    return points[0] if len(points)==1 else None

def begin_other_device_recovery(app,observation,offset):
    if '--ldplayer' in sys.argv:raise RuntimeError('Đã nhận diện đăng nhập thiết bị khác; luồng mở launcher này chỉ dành cho ROK PC.')
    from network_recovery import reconnect_game
    original=window_identity(app.game)
    target=None;fleet=getattr(app,'fleet',None)
    if fleet and not getattr(fleet,'login_in_progress',False):
        with fleet.lock:
            task=next((t for t in fleet.tasks if str(t['id'])==str(fleet.current)),None)
            if task:target=next((dict(g) for g in task.get('governors',[]) if g['id']==fleet.current_governor),None)
    reconnect_game(app,observation,offset)
    app._launcher_recovery={'original':original,'phase':'closing','since':time.monotonic(),'target':target}
    return recover_launcher_game(app)

def verify_resumed_governor(app):
    target=getattr(app,'_post_launcher_governor',None)
    if not target or getattr(app,'_verifying_launcher_governor',False):return
    from characters import CharacterNavigator,Character
    app._verifying_launcher_governor=True
    try:
        app.log('Kiểm tra lại đúng thống đốc sau khi mở lại ROK: '+target['name'])
        CharacterNavigator(app).select(Character(target['id'],target['name'],target.get('kingdom',''),(0,0)))
        app._post_launcher_governor=None
    finally:app._verifying_launcher_governor=False

def recover_launcher_game(app):
    pending=getattr(app,'_launcher_recovery',None)
    if not pending:
        verify_resumed_governor(app)
        return app.active()
    deadline=time.monotonic()+240
    while not app.stop.is_set() and time.monotonic()<deadline:
        try:game=GameWindow.find()
        except RuntimeError:game=None
        if game and window_identity(game)!=pending['original']:
            app.game=game;game.focus()
            if app.stop.wait(1):break
            if game.active():
                app._launcher_recovery=None;app._recent_detection=None
                app._post_launcher_governor=pending.get('target')
                app.log('ROK đã mở lại từ launcher — tiếp tục chờ tải và bước đang làm.')
                verify_resumed_governor(app)
                return True
        if pending['phase']=='closing':
            if game is None:
                pending['phase']='launcher';app.log('ROK đã đóng — đang tìm launcher ROK.')
            elif time.monotonic()-pending['since']>30:
                app._launcher_recovery=None
                raise RuntimeError('ROK chưa đóng sau Xác nhận; đọc lại hộp thoại trước khi thử lại.')
        if pending['phase']=='launcher':
            launcher=LauncherWindow.find();app.game=launcher;launcher.focus()
            if app.stop.wait(1):break
            screen,offset=launcher.capture();rows,_=app.vision.engine(screen)
            point=launcher_start_point(screen,rows)
            if not point:raise RuntimeError('Chưa nhận diện duy nhất nút Bắt đầu màu vàng trong launcher ROK.')
            if not launcher.active() or app.stop.is_set():raise RuntimeError('Launcher ROK mất tiêu điểm; chưa bấm Bắt đầu.')
            pg.moveTo(point[0]+offset[0],point[1]+offset[1],duration=.15)
            if not launcher.active() or app.stop.is_set():raise RuntimeError('Launcher ROK mất tiêu điểm; chưa bấm Bắt đầu.')
            pg.mouseDown()
            try:
                if app.stop.wait(.12):raise RuntimeError('Đã dừng khi bấm Bắt đầu launcher.')
            finally:pg.mouseUp()
            pending.update(phase='starting',clicked_at=time.monotonic())
            app.log('Đã bấm Bắt đầu trong launcher ROK — chờ cửa sổ game, không bấm lặp.')
        elif pending['phase']=='starting' and time.monotonic()-pending['clicked_at']>120:
            pending['phase']='launcher'
        if app.stop.wait(2):break
    if app.stop.is_set():raise RuntimeError('Đã dừng khi khôi phục ROK từ launcher.')
    raise RuntimeError('Hết thời gian chờ ROK mở lại từ launcher; giữ bước để thử lại.')
