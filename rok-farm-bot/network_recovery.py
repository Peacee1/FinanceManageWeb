"""Reconnect only the specifically recognized in-game network dialog."""
import pyautogui as pg

def reconnect_game(app,observation,offset):
    point=observation.buttons.get('reconnect')
    if not point:raise RuntimeError('Đã thấy mất kết nối game nhưng chưa xác định duy nhất nút Xác nhận.')
    if app.stop.is_set() or not app.active():raise RuntimeError('Chưa thể kết nối lại: bot đã dừng hoặc game mất tiêu điểm.')
    app.log('Đã đăng nhập trên thiết bị khác — bấm Xác nhận, sau đó mở lại ROK từ launcher.' if observation.state=='other_device_login' else 'Game bị ngắt kết nối mạng — tự bấm Xác nhận để kết nối lại.')
    pg.moveTo(int(point[0]+offset[0]),int(point[1]+offset[1]),duration=.15)
    if app.stop.is_set() or not app.active():raise RuntimeError('Chưa thể bấm kết nối lại: game mất tiêu điểm hoặc đã dừng.')
    pg.mouseDown()
    try:
        if app.stop.wait(.12):raise RuntimeError('Đã dừng trong khi kết nối lại.')
    finally:pg.mouseUp()
    app._recent_detection=None
    if app.stop.wait(3):raise RuntimeError('Đã dừng trong khi chờ kết nối game.')
    app.log('Đang chờ game kết nối lại; giữ nguyên tiến độ hiện tại.')
