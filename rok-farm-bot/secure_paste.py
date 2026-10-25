"""Short-lived Windows clipboard input; restore existing clipboard text afterward."""
import ctypes,time
from ctypes import wintypes
import pyautogui as pg
u=ctypes.windll.user32;k=ctypes.windll.kernel32
u.GetClipboardData.restype=wintypes.HANDLE
u.SetClipboardData.argtypes=[wintypes.UINT,wintypes.HANDLE];u.SetClipboardData.restype=wintypes.HANDLE
k.GlobalAlloc.argtypes=[wintypes.UINT,ctypes.c_size_t];k.GlobalAlloc.restype=wintypes.HANDLE
k.GlobalLock.argtypes=[wintypes.HANDLE];k.GlobalLock.restype=ctypes.c_void_p
k.GlobalUnlock.argtypes=[wintypes.HANDLE];k.GlobalFree.argtypes=[wintypes.HANDLE]
def open_clipboard():
 for _ in range(20):
  if u.OpenClipboard(None):return
  time.sleep(.05)
 raise RuntimeError('Không mở được clipboard để nhập game.')
def read_text():
 open_clipboard()
 try:
  handle=u.GetClipboardData(13)
  if not handle:return None
  pointer=k.GlobalLock(handle)
  if not pointer:return None
  try:return ctypes.wstring_at(pointer)
  finally:k.GlobalUnlock(handle)
 finally:u.CloseClipboard()
def put_text(text):
 data=(text+'\0').encode('utf-16-le');handle=k.GlobalAlloc(0x0002,len(data))
 if not handle:raise RuntimeError('Không chuẩn bị được nội dung nhập.')
 ptr=k.GlobalLock(handle);ctypes.memmove(ptr,data,len(data));k.GlobalUnlock(handle)
 try:
  open_clipboard()
  try:
   u.EmptyClipboard()
   if not u.SetClipboardData(13,handle):raise RuntimeError('Không đặt được nội dung nhập.')
   handle=None
  finally:u.CloseClipboard()
 finally:
  if handle:k.GlobalFree(handle)
def paste_text(value):
 saved=read_text()
 try:
  put_text(value);pg.hotkey('ctrl','v');time.sleep(.5)
 finally:put_text(saved or '')
