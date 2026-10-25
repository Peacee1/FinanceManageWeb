"""Observe input failures without logging typed text or secret key sequences."""
import functools,time
import pyautogui as pg

class InputDiagnostics:
    def __init__(self,app):self.app=app;self.originals={};self.last_key_log=0
    def wrap(self,name,original):
        @functools.wraps(original)
        def observed(*args,**kwargs):
            worker=getattr(self.app,'worker',None)
            if not worker or not worker.is_alive():return original(*args,**kwargs)
            mouse=name in {'click','moveTo','dragTo','scroll'}
            try:
                if self.app.stop.is_set():raise RuntimeError('Bot đã được yêu cầu dừng; không gửi thao tác.')
                if not self.app.active():raise RuntimeError('Game mất tiêu điểm; chưa gửi thao tác chuột/phím.')
                x=args[0] if args else kwargs.get('x');y=args[1] if len(args)>1 else kwargs.get('y')
                target=(round(x),round(y)) if name in {'click','moveTo','dragTo'} and isinstance(x,(int,float)) and isinstance(y,(int,float)) else None
                if name=='click' and target:
                    self.originals['moveTo'](*target,duration=.1)
                    actual=pg.position()
                    if abs(actual[0]-target[0])>4 or abs(actual[1]-target[1])>4:
                        raise RuntimeError('Không điều khiển được chuột tới điểm '+str(target)+'; vị trí thực tế '+str(tuple(actual))+'.')
                result=original(*args,**kwargs)
                if name in {'moveTo','dragTo'} and target:
                    actual=pg.position()
                    if abs(actual[0]-target[0])>4 or abs(actual[1]-target[1])>4:
                        raise RuntimeError('Chuột không tới điểm yêu cầu '+str(target)+'; thực tế '+str(tuple(actual))+'.')
                if mouse:self.app.log('Thao tác '+name+((' tại '+str(target)) if target else '')+' — đã gửi, chưa coi là game đã phản hồi.')
                elif time.monotonic()-self.last_key_log>3:
                    self.last_key_log=time.monotonic();self.app.log('Đã gửi thao tác bàn phím (không ghi nội dung nhập).')
                return result
            except Exception as error:
                # Never stringify keyboard exceptions: a library could echo input.
                detail=str(error) if mouse and isinstance(error,RuntimeError) else type(error).__name__
                self.app.log('Lỗi điều khiển '+name+': '+detail)
                raise
        return observed
    def install(self):
        for name in ('click','moveTo','dragTo','scroll','press','hotkey'):
            self.originals[name]=getattr(pg,name)
        for name,original in self.originals.items():setattr(pg,name,self.wrap(name,original))
    def uninstall(self):
        for name,original in self.originals.items():setattr(pg,name,original)
