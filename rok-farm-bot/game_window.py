"""Locate the actual game, focus it at user start, capture its client area."""
import ctypes
import sys
from ctypes import wintypes

import cv2
import numpy as np
from PIL import ImageGrab

user32 = ctypes.windll.user32
user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetWindow.argtypes = [wintypes.HWND, wintypes.UINT]
user32.GetWindow.restype = wintypes.HWND
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.IsIconic.argtypes = [wintypes.HWND]
user32.SetForegroundWindow.argtypes = [wintypes.HWND]
user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.GetClientRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
user32.ClientToScreen.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.POINT)]
user32.AttachThreadInput.argtypes = [wintypes.DWORD, wintypes.DWORD, wintypes.BOOL]
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.BringWindowToTop.argtypes = [wintypes.HWND]
user32.SetFocus.argtypes = [wintypes.HWND]


class GameWindow:
    def __init__(self, hwnd):
        self.hwnd = hwnd

    @classmethod
    def find(cls):
        if '--ldplayer' in sys.argv:
            from ldplayer_window import LDPlayerWindow
            return LDPlayerWindow.find()
        found = []
        callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        def callback(hwnd, _):
            title = ctypes.create_unicode_buffer(512)
            user32.GetWindowTextW(hwnd, title, len(title))
            name = title.value.lower().strip()
            if user32.IsWindowVisible(hwnd) and (name == 'rise of kingdoms' or name == '万国觉醒'):
                found.append(hwnd)
            return True
        user32.EnumWindows(callback_type(callback), 0)
        if len(found) != 1:
            raise RuntimeError('Không tìm thấy duy nhất một cửa sổ Rise of Kingdoms. Hãy mở game và đăng nhập trước.')
        return cls(found[0])

    def focus(self):
        if user32.IsIconic(self.hwnd):
            user32.ShowWindow(self.hwnd, 9)
        user32.SetForegroundWindow(self.hwnd)
        if self.active():
            return True
        # Windows may reject foreground activation from a background worker.
        # Temporarily join its input queue; always detach, including on failure.
        current = ctypes.windll.kernel32.GetCurrentThreadId()
        foreground = user32.GetForegroundWindow()
        threads = {user32.GetWindowThreadProcessId(self.hwnd, None)}
        if foreground:
            threads.add(user32.GetWindowThreadProcessId(foreground, None))
        attached = []
        try:
            for thread in threads:
                if thread and thread != current and user32.AttachThreadInput(current, thread, True):
                    attached.append(thread)
            user32.BringWindowToTop(self.hwnd)
            user32.SetForegroundWindow(self.hwnd)
            user32.SetFocus(self.hwnd)
        finally:
            for thread in reversed(attached):
                user32.AttachThreadInput(current, thread, False)
        return self.active()

    def active(self):
        foreground = user32.GetForegroundWindow()
        if foreground == self.hwnd:
            return True
        if not foreground:
            return False
        owner = foreground
        for _ in range(8):
            owner = user32.GetWindow(owner, 4)  # GW_OWNER
            if not owner:
                break
            if owner == self.hwnd:
                return True
        # Lilith's login modal can be a separate foreground window in the game process.
        game_pid = wintypes.DWORD()
        foreground_pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(self.hwnd, ctypes.byref(game_pid))
        user32.GetWindowThreadProcessId(foreground, ctypes.byref(foreground_pid))
        return bool(game_pid.value and game_pid.value == foreground_pid.value)

    def capture(self):
        if not self.active():
            raise RuntimeError('Game mất tiêu điểm. Bot đã dừng để tránh thao tác sang ứng dụng khác.')
        rect = wintypes.RECT()
        origin = wintypes.POINT(0, 0)
        capture_hwnd=getattr(self,'capture_hwnd',self.hwnd)
        if not user32.GetClientRect(capture_hwnd, ctypes.byref(rect)) or not user32.ClientToScreen(capture_hwnd, ctypes.byref(origin)):
            raise RuntimeError('Không đọc được vùng hiển thị game.')
        width, height = rect.right, rect.bottom
        if width < 600 or height < 400:
            raise RuntimeError('Game cần cửa sổ ít nhất 600 × 400.')
        image = ImageGrab.grab(bbox=(origin.x, origin.y, origin.x+width, origin.y+height), all_screens=True)
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR), (origin.x, origin.y)
