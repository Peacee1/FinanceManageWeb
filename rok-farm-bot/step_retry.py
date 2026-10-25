"""Retry the failed operation without restarting completed workflow stages."""
import time


def escape_and_observe(app,label):
    """One recovery key, followed by a fresh observation; never reset progress."""
    if app.stop.is_set() or not app.active():
        return
    import pyautogui as pg
    from characters import CharacterNavigator
    app.log('Gỡ kẹt bước '+label+': đã lỗi 5 lần — bấm Esc một lần và OCR lại.')
    if app.stop.is_set() or not app.active():return
    pg.press('esc')
    if app.stop.wait(.6):return
    state,*_=CharacterNavigator(app).inspect()
    app.log('Sau Esc tại bước '+label+': '+str(state or 'chưa xác định')+' — tiếp tục đúng bước.')

def retry_step(app,label,action,recover=None):
    failures=0
    while not app.stop.is_set():
        try:
            if recover and hasattr(app,'active') and not app.active():
                if recover() is False:
                    raise RuntimeError('Chưa lấy lại tiêu điểm game; chờ rồi thử lại, chưa thao tác.')
            return action()
        except Exception as error:
            if app.stop.is_set():raise
            failures+=1
            message=str(error) if isinstance(error,RuntimeError) else type(error).__name__
            app.log('Lỗi bước '+label+': '+message+' — thử lại đúng bước sau 3 giây.')
            if app.stop.wait(3):break
            if recover:
                try:recover()
                except Exception:pass
            if failures%5==0:
                reporter=getattr(app,'error_reporter',None)
                if reporter:
                    try:
                        from characters import CharacterNavigator
                        CharacterNavigator(app).inspect()
                    except Exception:
                        if app.stop.is_set():raise
                    try:reporter.emit('Lỗi bước '+label+': '+message,force=True)
                    except Exception:pass
                try:escape_and_observe(app,label)
                except Exception as recovery_error:
                    if app.stop.is_set():raise
                    app.log('Chưa gỡ kẹt bằng Esc tại bước '+label+': '+
                            (str(recovery_error) if isinstance(recovery_error,RuntimeError) else type(recovery_error).__name__)+
                            ' — tiếp tục thử đúng bước sau 3 giây.')
                    if app.stop.wait(3):break
    raise RuntimeError('Đã dừng ở bước '+label+'.')
