"""Local, calibrated screen automation. Run: python bot.py"""
import ctypes
import json
import os
import queue
import random
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

import cv2
import keyboard
import numpy as np
import pyautogui as pg
from PIL import Image, ImageTk
from vision import Vision
from game_window import GameWindow
from farm_cycle import FarmCycle
from characters import CharacterNavigator, Character
from round_state import RoundState
from reset_data import clear_bot_data
from step_retry import retry_step

ROOT = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / ('ROKFarmBotPCOffline' if '--offline' in sys.argv else 'ROKFarmBotLDPlayer' if '--ldplayer' in sys.argv else 'ROKFarmBot')
ROOT.mkdir(parents=True, exist_ok=True)
CONFIG = ROOT / 'config.json'
ASSETS = Path(__file__).resolve().parent / 'assets'
pg.FAILSAFE = True
pg.PAUSE = .25
STATES = ['inside', 'outside', 'search', 'deposit', 'new', 'march']
POINTS = ['open_search', 'food', 'wood', 'stone', 'gold', 'minus', 'plus',
          'find', 'gather', 'new_army', 'march']
RESOURCES = {'Lương thực': 'food', 'Gỗ': 'wood', 'Đá': 'stone', 'Vàng': 'gold'}
LABELS = dict(zip(POINTS, ['Mở tìm kiếm', 'Lương thực', 'Gỗ', 'Đá', 'Vàng', 'Giảm cấp mỏ',
                         'Tăng cấp mỏ', 'Tìm kiếm', 'Thu thập', 'Quân mới', 'Hành quân']))
STATE_LABELS = dict(zip(STATES, ['Trong thành', 'Ngoài thành', 'Bảng tìm kiếm', 'Mỏ đã chọn',
                                'Bảng hàng đợi', 'Bảng xuất quân']))
DYNAMIC_POINTS = {'minus', 'plus', 'find'}


def relative_position(point, source_anchor, target_anchor):
    return [point[0] - source_anchor[0] + target_anchor[0],
            point[1] - source_anchor[1] + target_anchor[1]]


class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('ROK — PC Offline' if '--offline' in sys.argv else 'ROK — Farm tài nguyên / LDPlayer' if '--ldplayer' in sys.argv else 'ROK — Farm tài nguyên')
        self.root.geometry('760x800')
        self.root.minsize(720, 720)
        self.root.option_add('*Font', ('Segoe UI', 10))
        style = ttk.Style(self.root)
        style.theme_use('clam')
        style.configure('TButton', padding=8)
        try:
            self.cfg = json.loads(CONFIG.read_text('utf-8')) if CONFIG.exists() else {}
        except (ValueError, OSError):
            self.cfg = {}
        self.cfg.setdefault('points', {})
        self.cfg.setdefault('templates', {})
        self.cfg.setdefault('anchors', {})
        self.messages = queue.Queue()
        self.stop = threading.Event()
        self.worker = None
        self.resource = tk.StringVar(value=next((label for label, key in RESOURCES.items()
                                               if key == self.cfg.get('resource', 'food')), 'Lương thực'))
        self.level = tk.IntVar(value=self.cfg.get('level', 8))
        self.armies = tk.IntVar(value=self.cfg.get('armies', 5))
        old_resource = self.cfg.get('resource', 'food')
        saved_allocations = self.cfg.get('allocations', {key: self.armies.get() if key == old_resource else 0 for key in RESOURCES.values()})
        self.allocations = {key: tk.IntVar(value=saved_allocations.get(key, 0)) for key in RESOURCES.values()}
        self.total_label = tk.StringVar()
        self.interval = tk.IntVar(value=self.cfg.get('interval', 60))
        self.repeat_hours = tk.DoubleVar(value=self.cfg.get('repeat_hours', 1))
        self.title = tk.StringVar(value='LDPlayer' if '--ldplayer' in sys.argv else 'Rise of Kingdoms')
        self.auto = tk.BooleanVar(value=True)
        self.game = None
        self.vision = None
        self.status = tk.StringVar(value='Mở game, chọn cấu hình farm rồi bấm Bắt đầu. Mọi bước nhận diện đều tự động.')
        panel = ttk.Frame(self.root, padding=16)
        panel.pack(fill='both', expand=True)
        ttk.Label(panel, text='FARM TẤT CẢ NHÂN VẬT NGÔI SAO', font=('Segoe UI', 18, 'bold')).pack(anchor='w')
        ttk.Label(panel, text='Nhận tài nguyên liên minh → farm → nhân vật tiếp theo → lặp theo giờ').pack(anchor='w', pady=8)
        tabs = ttk.Notebook(panel)
        tabs.pack(fill='both', expand=True, pady=10)
        settings = ttk.Frame(tabs, padding=15)
        guide = ttk.Frame(tabs, padding=15)
        progress_tab = ttk.Frame(tabs, padding=10)
        log_tab = ttk.Frame(tabs, padding=10)
        tabs.add(settings, text='Cấu hình farm')
        tabs.add(guide, text='Hướng dẫn')
        tabs.add(progress_tab, text='Nhân vật / Tiến độ')
        tabs.add(log_tab, text='Nhật ký')
        self.round_label = tk.StringVar(value='Chưa quét danh sách nhân vật ngôi sao.')
        ttk.Label(progress_tab, textvariable=self.round_label).pack(anchor='w', pady=(0, 8))
        self.character_table = ttk.Treeview(progress_tab, columns=('name', 'kingdom', 'status'), show='headings')
        for key, label, width in [('name', 'Nhân vật', 270), ('kingdom', 'Vương quốc', 100), ('status', 'Trạng thái vòng hiện tại', 290)]:
            self.character_table.heading(key, text=label)
            self.character_table.column(key, width=width)
        self.character_table.pack(fill='both', expand=True)
        self.log_text = tk.Text(log_tab, wrap='word', state='disabled', font=('Segoe UI', 10))
        log_scroll = ttk.Scrollbar(log_tab, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scroll.set)
        log_scroll.pack(side='right', fill='y')
        self.log_text.pack(fill='both', expand=True)
        ttk.Label(settings, text='Số đạo quân theo tài nguyên (0 = bỏ qua)').pack(anchor='w', pady=(6, 8))
        for label, key in RESOURCES.items():
            row = ttk.Frame(settings)
            row.pack(fill='x', pady=3)
            ttk.Label(row, text=label, width=18).pack(side='left')
            ttk.Combobox(row, textvariable=self.allocations[key], values=list(range(8)), state='readonly', width=8).pack(side='right')
            self.allocations[key].trace_add('write', self.update_allocation_total)
        ttk.Label(settings, textvariable=self.total_label, wraplength=520).pack(anchor='w', pady=8)
        self.update_allocation_total()
        for label, variable, values in [('Cấp mỏ ưu tiên', self.level, list(range(1, 9)))]:
            ttk.Label(settings, text=label).pack(anchor='w', pady=(10, 4))
            ttk.Combobox(settings, textvariable=variable, values=values, state='readonly').pack(fill='x')
        ttk.Label(settings, text='Thời gian giữa hai vòng tất cả nhân vật (giờ)').pack(anchor='w', pady=(10, 4))
        ttk.Combobox(settings, textvariable=self.repeat_hours, values=[.5, 1, 2, 3, 4, 6, 8, 12, 24], state='readonly').pack(fill='x')
        ttk.Label(settings, text='Gửi theo vòng: gỗ → đá → lương thực → vàng.\nVí dụ 2 gỗ + 2 đá + 1 lương thực = 5 đạo.\nTổng là giới hạn quân hoạt động; khi có chỗ trống, tiếp tục lượt kế tiếp.', wraplength=520).pack(anchor='w', pady=8)
        ttk.Label(guide, text='1. Mở game, nhập số đạo quân cho từng tài nguyên và khoảng lặp theo giờ.\n\n2. Bắt đầu: tự mở hồ sơ, cài đặt, Tài khoản/Nhân vật và quét chỉ nhóm Nhân vật ngôi sao.\n\n3. Lần lượt chuyển từng nhân vật, kiểm tra tên và dấu tích đang dùng. Log ghi tên nhân vật đã đăng nhập.\n\n4. O → nếu có liên minh → Lãnh thổ → NHẬN. Nếu chưa có liên minh, bỏ qua. Esc đến khi trở lại trong/ngoài thành.\n\n5. Farm theo vòng tài nguyên đã đặt. Khi đã đạt giới hạn quân hoạt động, đánh dấu hoàn tất và sang nhân vật kế tiếp. Quân đang hoạt động được tính vào giới hạn.\n\n6. Chỉ sau khi mọi nhân vật hoàn tất mới chờ số giờ đã chọn rồi bắt đầu vòng mới. Mở lại app vẫn giữ tiến độ vòng đang chạy.\n\nF8 dừng. Nhân vật lỗi không được đánh dấu hoàn tất; tối đa 3 lần thử trong một lượt chạy. Không đăng nhập lại nhân vật đã hoàn tất cùng vòng. Đổi cấu hình farm bắt đầu vòng mới.', wraplength=660, justify='left').pack(anchor='w')
        ttk.Button(guide, text='Mở nhật ký và ảnh chẩn đoán', command=lambda: os.startfile(ROOT)).pack(fill='x', pady=15)
        self.item_keys = {}
        self.progress = tk.StringVar()
        ttk.Button(panel, text='Bắt đầu — tự vào game và farm', command=self.start).pack(fill='x', pady=4)
        ttk.Button(panel, text='Dừng (F8)', command=self.stop_all).pack(fill='x')
        ttk.Button(panel, text='Clear data / Reset bot', command=self.request_reset).pack(fill='x', pady=(4, 0))
        if '--offline' not in sys.argv:
            ttk.Button(panel, text='Kết nối web / VPS', command=self.connect_fleet).pack(fill='x', pady=4)
        if '--ldplayer' in sys.argv:
            ttk.Button(panel,text='Chọn LDPlayer / cửa sổ giả lập',command=self.choose_ldplayer).pack(fill='x',pady=4)
            ttk.Label(guide,text='LDPlayer: dùng màn hình ngang ít nhất 1280 × 720. Trong Keyboard Mapping, gán O cho Liên minh, F cho Tìm kiếm, Space cho Trong/Ngoài thành, Esc cho Back. Tạo client riêng trên web và chọn file ghép nối mới. Dữ liệu bản LDPlayer nằm riêng trong ROKFarmBotLDPlayer.',wraplength=660).pack(anchor='w',pady=10)
        ttk.Label(panel, textvariable=self.status, wraplength=560).pack(pady=10)
        keyboard.add_hotkey('f8', self.stop_all)
        self.root.protocol('WM_DELETE_WINDOW', self.close)
        self.refresh_progress()
        self.root.after(100, self.drain_messages)
        if '--offline' not in sys.argv and '--smoke-test' not in sys.argv and (ROOT/'first-client.json').is_file():
            self.root.after(1500, lambda: self.connect_fleet(use_saved=True))
        if '--smoke-test' in sys.argv:
            self.root.after(1200, self.smoke_test)
        self.root.mainloop()

    def smoke_test(self):
        result = {
            'ui': 'ok', 'tabs': 4, 'calibration_items': len(self.item_keys), 'repeat_hours': self.repeat_hours.get(),
            'resource': self.resource.get(), 'width': self.root.winfo_width(),
            'allocations': {key: value.get() for key, value in self.allocations.items()},
            'height': self.root.winfo_height(), 'automation_started': self.worker is not None
        }
        try:
            vision = Vision(ASSETS)
            sample = cv2.imdecode(np.fromfile(ASSETS / 'ocr-check.png', dtype=np.uint8), cv2.IMREAD_COLOR)
            observation = vision.analyze(sample)
            result['ocr_model'] = 'ok' if observation.buttons.get('find') else 'failed'
            result['ocr_texts'] = [row[0] for row in observation.texts]
        except Exception as error:
            result['ocr_model'] = str(error)
        (ROOT / 'smoke-test.json').write_text(json.dumps(result, ensure_ascii=False), 'utf-8')
        self.close()

    def update_allocation_total(self, *_):
        counts = {key: value.get() for key, value in self.allocations.items()}
        total = sum(counts.values())
        self.armies.set(total)
        self.total_label.set(f'Tổng: {total} đạo quân' + (' — cần tổng từ 1 đến 7' if not 1 <= total <= 7 else ''))

    def close(self):
        self.stop_all()
        keyboard.unhook_all_hotkeys()
        self.root.destroy()

    def request_reset(self):
        if getattr(self, 'resetting', False):
            return
        self.resetting = True
        self.stop_all()
        self.status.set('Đang dừng bot trước khi reset dữ liệu...')
        self.root.after(100, self.finish_reset)

    def finish_reset(self):
        if self.worker and self.worker.is_alive():
            self.root.after(100, self.finish_reset)
            return
        try:
            clear_bot_data(ROOT)
            self.cfg = {'points': {}, 'templates': {}, 'anchors': {}}
            self.vision = None
            self.game = None
            self.worker = None
            for attribute in ['journal', 'cycle', 'current_character', 'effective_level', 'settings']:
                if hasattr(self, attribute):
                    delattr(self, attribute)
            self.resource.set('Lương thực')
            self.level.set(8)
            self.interval.set(60)
            self.repeat_hours.set(1)
            for key, variable in self.allocations.items():
                variable.set(5 if key == 'food' else 0)
            self.update_allocation_total()
            while not self.messages.empty():
                self.messages.get_nowait()
            self.character_table.delete(*self.character_table.get_children())
            self.round_label.set('Chưa quét danh sách nhân vật ngôi sao.')
            self.log_text.configure(state='normal')
            self.log_text.delete('1.0', 'end')
            self.log_text.configure(state='disabled')
            self.status.set('Đã reset dữ liệu bot. Chọn cấu hình và Bắt đầu để chạy vòng mới.')
        except Exception as error:
            messagebox.showerror('Không reset được', str(error))
        finally:
            self.resetting = False

    def save(self):
        temporary = CONFIG.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.cfg, ensure_ascii=False, indent=2), 'utf-8')
        temporary.replace(CONFIG)

    def refresh_progress(self):
        self.progress.set(f"Đã lưu {len(self.cfg['points'])}/{len(POINTS)} vị trí nút và "
                          f"{len(self.cfg['templates'])}/13 ảnh nhận diện.")

    def drain_messages(self):
        while not self.messages.empty():
            message = self.messages.get_nowait()
            if isinstance(message, tuple):
                if message[0] == 'log':
                    self.log_text.configure(state='normal')
                    self.log_text.insert('end', message[1]+'\n')
                    self.log_text.see('end')
                    self.log_text.configure(state='disabled')
                elif message[0] == 'characters':
                    completed = sum(item['status'].startswith('Hoàn tất') for item in message[1])
                    self.round_label.set(f'Vòng hiện tại: {completed}/{len(message[1])} nhân vật hoàn tất')
                    self.character_table.delete(*self.character_table.get_children())
                    for item in message[1]:
                        self.character_table.insert('', 'end', iid=item['identity'], values=(item['name'], item['kingdom'], item['status']))
                else:
                    self.show_preview(*message)
            else:
                self.status.set(message)
        self.root.after(100, self.drain_messages)

    def show_preview(self, path, summary):
        win = tk.Toplevel(self.root)
        win.title('Kết quả nhận diện — chưa thao tác trong game')
        picture = Image.open(path)
        picture.thumbnail((1000, 600))
        photo = ImageTk.PhotoImage(picture)
        label = ttk.Label(win, image=photo)
        label.image = photo
        label.pack(padx=8, pady=8)
        ttk.Label(win, text=summary, wraplength=900).pack(padx=8, pady=8)

    def calibrate(self):
        if self.worker and self.worker.is_alive():
            return
        kind, name = self.item_keys[self.item.get()].split(':')
        anchor = RESOURCES[self.calibration_resource.get()]
        if (kind == 'point' and name in DYNAMIC_POINTS) or (kind == 'state' and name == 'search'):
            if anchor not in self.cfg['points']:
                messagebox.showerror('Cần lưu biểu tượng trước', 'Hiệu chỉnh vị trí nút tài nguyên ' + self.calibration_resource.get() + ' trước.')
                return
        self.capture_anchor = anchor
        self.root.withdraw()
        self.root.after(700, lambda: self.overlay(kind, name))

    def overlay(self, kind, name):
        screenshot = pg.screenshot()
        win = tk.Toplevel(self.root)
        win.overrideredirect(True)
        win.geometry(f'{screenshot.width}x{screenshot.height}+0+0')
        win.attributes('-topmost', True)
        canvas = tk.Canvas(win, highlightthickness=0, cursor='crosshair')
        canvas.pack(fill='both', expand=True)
        photo = ImageTk.PhotoImage(screenshot)
        canvas.create_image(0, 0, image=photo, anchor='nw')
        canvas.image = photo
        canvas.create_text(25, 25, anchor='nw', fill='red', font=('Arial', 18),
                           text='Bấm tâm nút' if kind == 'point' else 'Kéo khoanh vùng chữ / biểu tượng ổn định. Esc hủy.')
        start = []
        rect = []
        def down(event):
            start[:] = [event.x, event.y]
            rect[:] = [canvas.create_rectangle(event.x, event.y, event.x, event.y, outline='red', width=3)]
        def move(event):
            if rect:
                canvas.coords(rect[0], *start, event.x, event.y)
        def finish(event):
            if not start:
                return
            if kind == 'point':
                self.cfg['points'][name] = [event.x, event.y]
                if name in DYNAMIC_POINTS:
                    self.cfg['anchors'][name] = list(self.cfg['points'][self.capture_anchor])
            else:
                x1, x2 = sorted([start[0], event.x])
                y1, y2 = sorted([start[1], event.y])
                if x2 - x1 < 8 or y2 - y1 < 8:
                    return
                key = kind + ':' + name
                file = ROOT / (kind + '_' + name + '.png')
                screenshot.crop((x1, y1, x2, y2)).save(file)
                self.cfg['templates'][key] = {'file': file.name, 'region': [x1, y1, x2 - x1, y2 - y1]}
                if key == 'state:search':
                    self.cfg['templates'][key]['anchor'] = list(self.cfg['points'][self.capture_anchor])
            self.save()
            self.refresh_progress()
            win.destroy()
            self.root.deiconify()
            self.status.set('Đã lưu ' + kind + ':' + name)
        canvas.bind('<ButtonPress-1>', down)
        canvas.bind('<B1-Motion>', move)
        canvas.bind('<ButtonRelease-1>', finish)
        win.bind('<Escape>', lambda e: (win.destroy(), self.root.deiconify()))
        win.focus_force()

    def log(self, text):
        reporter=getattr(self,'error_reporter',None)
        if reporter:
            reporter.queue_log(text)
            if text.startswith('Lỗi') and 'thử lại đúng bước sau 3 giây' not in text:reporter.emit(text)
        self.messages.put(text)
        timestamp = datetime.now(timezone(timedelta(hours=7))).strftime('%d/%m/%Y %H:%M:%S')
        line = '['+timestamp+'] '+text
        self.messages.put(('log', line))
        with (ROOT / 'bot.log').open('a', encoding='utf-8') as stream:
            stream.write(line + '\n')

    def stop_all(self):
        self.stop.set()
        if getattr(self, 'fleet', None):
            self.fleet.closed.set()

    def connect_fleet(self, use_saved=False):
        if '--offline' in sys.argv:
            self.log('Bản PC Offline không kết nối server; dùng nút Bắt đầu để chạy tại máy.')
            return
        if self.worker and self.worker.is_alive():
            messagebox.showinfo('Đang chạy', 'Dừng tác vụ hiện tại trước khi kết nối web.')
            return
        from tkinter import filedialog
        saved=ROOT/'first-client.json'
        path = str(saved) if use_saved and saved.is_file() else filedialog.askopenfilename(title='Chọn file ghép nối từ web', filetypes=[('JSON','*.json')])
        if not path:
            return
        try:
            from fleet_client import FleetClient
            from pairing import load_pairing
            pairing=load_pairing(path)
            self.log('Đã đọc JSON ghép nối: '+Path(path).name+'; client '+pairing['botId'])
            self.fleet=FleetClient(self,pairing,ROOT)
            if Path(path).resolve()!=saved.resolve():saved.write_text(json.dumps(pairing),'utf-8')
            self.stop.clear()
            self.worker=threading.Thread(target=self.fleet.run,daemon=True)
            self.worker.start()
            self.log('Đang kết nối server — tự nhận lệnh từ web khi sẵn sàng.')
        except Exception:
            messagebox.showerror('Không kết nối được', 'Kiểm tra file ghép nối VPS.')

    def choose_ldplayer(self):
        if self.worker and self.worker.is_alive():
            messagebox.showinfo('Đang chạy','Dừng client trước khi đổi cửa sổ LDPlayer.');return
        from tkinter import filedialog
        from ldplayer_window import list_instances,save_instance
        console=filedialog.askopenfilename(title='Chọn ldconsole.exe / dnconsole.exe của LDPlayer',filetypes=[('LDPlayer console','*.exe')])
        if not console:return
        try:
            instances=list_instances(console)
            if not instances:raise RuntimeError('Chưa có LDPlayer đang chạy. Mở giả lập trước.')
            win=tk.Toplevel(self.root);win.title('Chọn cửa sổ LDPlayer');win.geometry('420x170')
            names=[str(i['index'])+' · '+i['name'] for i in instances]
            choice=ttk.Combobox(win,values=names,state='readonly');choice.pack(fill='x',padx=20,pady=20);choice.current(0)
            def confirm():
                item=instances[choice.current()];save_instance(console,item['index']);self.game=None;self.title.set(item['name']);self.log('Đã chọn LDPlayer '+item['name']+' — instance '+str(item['index']));win.destroy()
            ttk.Button(win,text='Lưu cửa sổ',command=confirm).pack()
        except Exception as e:messagebox.showerror('LDPlayer',str(e))

    def active(self):
        if self.game is not None:
            return self.game.active()
        user32 = ctypes.windll.user32
        buffer = ctypes.create_unicode_buffer(512)
        user32.GetWindowTextW(user32.GetForegroundWindow(), buffer, len(buffer))
        return self.settings['title'].casefold() in buffer.value.casefold()

    def score(self, key, screen):
        entry = self.cfg['templates'].get(key)
        if not entry:
            return -1
        x, y, w, h = entry['region']
        template = self.templates[key]
        positions = [(x, y)]
        if 'anchor' in entry:
            positions = [relative_position((x, y), entry['anchor'], self.cfg['points'][resource])
                         for resource in RESOURCES.values() if resource in self.cfg['points']]
        scores = []
        for px, py in positions:
            crop = screen[max(0, py-6):py+h+6, max(0, px-6):px+w+6]
            if crop.shape[0] >= h and crop.shape[1] >= w:
                scores.append(float(cv2.minMaxLoc(cv2.matchTemplate(crop, template, cv2.TM_SQDIFF_NORMED))[0]))
        return min(scores) if scores else -1

    def matches(self, key, screen):
        score = self.score(key, screen)
        return 0 <= score <= .035

    def click(self, key):
        if self.stop.is_set() or not self.active():
            raise RuntimeError('Đã dừng hoặc game không còn là cửa sổ đang chọn.')
        point = self.cfg['points'][key]
        if key in DYNAMIC_POINTS:
            point = relative_position(point, self.cfg['anchors'][key],
                                      self.cfg['points'][self.settings['resource']])
        pg.click(*point)

    def start(self, probe=False):
        if getattr(self, 'resetting', False):
            return
        if self.worker and self.worker.is_alive():
            return
        try:
            counts = {key: value.get() for key, value in self.allocations.items()}
            cycle = FarmCycle(counts)
            if self.cfg.get('cycle_plan') == cycle.plan:
                cycle = FarmCycle(counts, self.cfg.get('cycle_index', 0))
            self.cycle = cycle
            self.settings = {'resource': RESOURCES[self.resource.get()], 'level': self.level.get(),
                             'armies': self.armies.get(), 'interval': self.interval.get(), 'title': self.title.get().strip(),
                             'auto': bool(self.auto.get() or probe), 'probe': probe, 'allocations': counts}
            self.settings['repeat_hours'] = self.repeat_hours.get()
            if not .25 <= self.settings['repeat_hours'] <= 168:
                raise ValueError('Khoảng lặp phải từ 0,25 đến 168 giờ.')
            self.settings['resource'] = self.cycle.current
            if self.settings['interval'] < 10 or not self.settings['title']:
                raise ValueError('Thời gian kiểm tra tối thiểu 10 giây; tên cửa sổ không được trống.')
            if self.settings['auto']:
                self.game = GameWindow.find()
                self.cfg.update({key: value for key, value in self.settings.items() if key != 'probe'})
                self.cfg.update(cycle_plan=self.cycle.plan, cycle_index=self.cycle.cursor)
                self.save()
                self.stop.clear()
                self.worker = threading.Thread(target=self.run, daemon=True)
                self.worker.start()
                return
            required_points = set(POINTS) - {'food', 'wood', 'stone', 'gold'} | {self.settings['resource']}
            required_templates = {'state:' + s for s in STATES} | {'free:free'} | {'queue:' + str(i) for i in range(6)}
            missing = sorted(required_points - self.cfg['points'].keys()) + sorted(required_templates - self.cfg['templates'].keys())
            if missing:
                labels_by_key = {key: label for label, key in self.item_keys.items()}
                raise ValueError('Vào tab Hiệu chỉnh để lưu các mục còn thiếu:\n\n' + '\n'.join(
                    labels_by_key.get(key, labels_by_key.get('point:' + key, key)) for key in missing))
            if DYNAMIC_POINTS - self.cfg['anchors'].keys() or 'anchor' not in self.cfg['templates']['state:search']:
                raise ValueError('Cần hiệu chỉnh lại Giảm cấp mỏ, Tăng cấp mỏ, Tìm kiếm và nhận diện Bảng tìm kiếm.\nChọn đúng tài nguyên đang mở trong game ở tab Hiệu chỉnh.')
            self.templates = {k: cv2.imdecode(np.fromfile(ROOT / v['file'], dtype=np.uint8), cv2.IMREAD_COLOR)
                              for k, v in self.cfg['templates'].items()}
            if any(v is None for v in self.templates.values()):
                raise ValueError('Thiếu ảnh nhận diện. Hãy hiệu chỉnh lại.')
            self.cfg.update(self.settings)
            self.save()
        except Exception as error:
            messagebox.showerror('Chưa thể chạy', str(error))
            return
        self.stop.clear()
        self.worker = threading.Thread(target=self.run, daemon=True)
        self.worker.start()

    def run(self):
        failure = None
        try:
            if self.settings['auto']:
                self.log('Đang tự chọn cửa sổ '+('LDPlayer' if '--ldplayer' in sys.argv else 'Rise of Kingdoms')+'...')
                self.game.focus()
            if self.stop.wait(2 if self.settings['auto'] else 5):
                return
            if self.settings['auto']:
                if self.settings['probe']:
                    self.run_auto()
                else:
                    self.run_all_characters()
                return
            pending = False
            unknown = 0
            last_action = None
            repeats = 0
            while not self.stop.is_set():
                if not self.active():
                    raise RuntimeError('Game mất tiêu điểm. Chọn game rồi bắt đầu lại.')
                screen = cv2.cvtColor(np.array(pg.screenshot()), cv2.COLOR_RGB2BGR)
                state = next((s for s in ['march', 'new', 'deposit', 'search', 'inside', 'outside']
                              if self.matches('state:' + s, screen)), None)
                if state is None:
                    unknown += 1
                    if unknown >= 10:
                        raise RuntimeError('Không nhận diện được màn hình trong 20 giây. Kiểm tra hoặc hiệu chỉnh lại.')
                    self.stop.wait(2)
                    continue
                unknown = 0
                if state == last_action:
                    repeats += 1
                    if repeats > 3:
                        raise RuntimeError('Màn hình không chuyển sau thao tác: ' + state)
                else:
                    repeats = 0
                last_action = state
                self.log('Đang xử lý: ' + state)
                if state == 'inside':
                    pg.press('space')
                elif state == 'outside':
                    pending = False
                    self.click('open_search')
                elif state == 'search':
                    self.click(self.settings['resource'])
                    if self.stop.wait(.8):
                        break
                    for _ in range(8):
                        self.click('minus')
                    for _ in range(self.settings['level'] - 1):
                        self.click('plus')
                    self.click('find')
                elif state == 'deposit':
                    if not self.matches('free:free', screen):
                        raise RuntimeError('Mỏ không trống hoặc không đọc được trạng thái mỏ.')
                    self.click('gather')
                elif state == 'new':
                    scores = sorted((self.score('queue:' + str(i), screen), i) for i in range(6))
                    best, count = scores[0]
                    if best < 0 or best > .035 or scores[1][0] - best < .005:
                        raise RuntimeError('Không đọc chắc chắn được Hàng đợi x/5. Hiệu chỉnh lại các ảnh queue.')
                    if count >= self.settings['armies']:
                        # Leave the panel intact; re-read its counter before every new dispatch.
                        self.log(f'Đang có {count} đạo quân. Chờ quân về...')
                        last_action = None
                        self.stop.wait(self.settings['interval'])
                        continue
                    self.click('new_army')
                elif state == 'march':
                    if pending:
                        raise RuntimeError('Chưa xác nhận xuất quân. Dừng để tránh bấm lặp.')
                    self.click('march')
                    pending = True
                self.stop.wait(3)
        except Exception as error:
            failure = str(error)
        finally:
            self.stop.set()
            self.log('Dừng: ' + failure if failure else 'Bot đã dừng.')

    def snapshot(self):
        if (getattr(self,'_launcher_recovery',None) or getattr(self,'_post_launcher_governor',None)) and not getattr(self,'_verifying_launcher_governor',False):
            from launcher_recovery import recover_launcher_game
            recover_launcher_game(self)
        if self.game is not None:
            return self.game.capture()
        if not self.active():
            raise RuntimeError('Game mất tiêu điểm. Chọn game rồi bắt đầu lại.')
        rect = (ctypes.c_long * 4)()
        user32 = ctypes.windll.user32
        user32.GetWindowRect(user32.GetForegroundWindow(), ctypes.byref(rect))
        screenshot = pg.screenshot()
        left, top = max(0, rect[0]), max(0, rect[1])
        right, bottom = min(screenshot.width, rect[2]), min(screenshot.height, rect[3])
        if right-left < 600 or bottom-top < 400:
            raise RuntimeError('Cửa sổ game quá nhỏ hoặc nằm ngoài màn hình chính.')
        image = np.array(screenshot.crop((left, top, right, bottom)))
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR), (left, top)

    def detect(self):
        chat_closes=0
        while True:
            screen, offset = self.snapshot()
            observation = self.vision.analyze(screen)
            if observation.state=='chat':
                if chat_closes>=2:raise RuntimeError('Bảng chat vẫn mở sau Esc; chưa gửi phím tìm kiếm.')
                self.log('OCR: Bảng chat đang mở — bấm Esc đóng chat, chưa gửi F.')
                CharacterNavigator(self).key('esc')
                chat_closes+=1
                continue
            if observation.state!='other_device_login':break
            from launcher_recovery import begin_other_device_recovery
            begin_other_device_recovery(self,observation,offset)
        if observation.state=='network_disconnected':
            from network_recovery import reconnect_game
            reconnect_game(self,observation,offset)
            observation.state='loading'
            observation.buttons={}
        cv2.imencode('.png', screen)[1].tofile(ROOT / 'last-screen.png')
        (ROOT / 'last-observation.json').write_text(json.dumps({
            'state': observation.state, 'buttons': observation.buttons, 'queue': observation.queue,
            'capacity': observation.capacity, 'level': observation.level, 'free': observation.free,
            'texts': observation.texts
        }, ensure_ascii=False, default=int), 'utf-8')
        if self.stop.is_set() or not self.active():
            raise RuntimeError('Đã dừng hoặc game mất tiêu điểm trong lúc nhận diện.')
        self.error_screen=(screen,observation.state,[t for t,_,_ in observation.texts],time.monotonic())
        self._recent_detection=(observation,screen,offset,time.monotonic())
        return observation, screen, offset

    def recent_click_observation(self,key,expected_state):
        recent=getattr(self,'_recent_detection',None)
        if not recent or time.monotonic()-recent[3]>1 or key=='gather':return None
        observation,old,offset,_=recent
        point=observation.buttons.get(key)
        if observation.state!=expected_state or point is None:return None
        if key=='new_army' and 'queue' not in observation.regions:return None
        if key=='find' and 'level' not in observation.regions:return None
        fresh,new_offset=self.snapshot()
        if fresh.shape!=old.shape or new_offset!=offset:return None
        h,w=old.shape[:2];scale=min(w/1770,h/994)
        regions=[observation.regions.get(key) or [max(0,int(point[0]-80*scale)),max(0,int(point[1]-22*scale)),int(160*scale),int(44*scale)]]
        if key=='new_army':regions.append(observation.regions['queue'])
        if key=='find':regions.append(observation.regions['level'])
        for x,y,rw,rh in regions:
            a,b=old[y:y+rh,x:x+rw],fresh[y:y+rh,x:x+rw]
            if not a.size or a.shape!=b.shape or float(cv2.matchTemplate(a,b,cv2.TM_SQDIFF_NORMED)[0,0])>.015:return None
        self._recent_detection=None
        return observation,offset

    def auto_click(self, key, expected_state):
        recent=self.recent_click_observation(key,expected_state)
        if recent:observation,offset=recent
        else:observation,_,offset=self.detect()
        point = observation.buttons.get(key)
        if observation.state != expected_state or point is None:
            raise RuntimeError('Không nhận diện chắc chắn nút ' + LABELS[key] + '. Đã lưu ảnh chẩn đoán tự động.')
        if key == 'new_army' and (observation.queue is None or observation.capacity is None or
                                 observation.queue >= min(self.settings['armies'], observation.capacity)):
            raise RuntimeError('Hàng đợi đã đầy hoặc không đọc được.')
        if key == 'gather' and not observation.free:
            raise RuntimeError('Không xác nhận được mỏ trống trước khi bấm.')
        if key == 'find' and observation.level != getattr(self, 'effective_level', self.settings['level']):
            raise RuntimeError('Cấp mỏ chưa đúng cấu hình trước khi tìm kiếm.')
        if self.stop.is_set() or not self.active():
            raise RuntimeError('Đã dừng hoặc game mất tiêu điểm.')
        pg.click(int(point[0]+offset[0]), int(point[1]+offset[1]))
        return observation

    def run_auto(self, one_pass=False):
        if self.vision is None:
            self.log('Đang nạp mô hình OCR trên CPU...')
            self.vision = Vision(ASSETS, ROOT / 'vision-cache')
        previous = None
        repeats = 0
        unknown = 0
        checkpoint=getattr(self,'dispatch_state',{})
        self.dispatch_state=checkpoint
        if checkpoint.get('resource_override') in {'food','wood','stone','gold'}:
            self.settings['resource']=checkpoint['resource_override']
        pending = checkpoint.get('pending',False)
        authorized_march = checkpoint.get('authorized',False)
        space_sent = False
        search_sent = False
        dispatch_count_before = checkpoint.get('before')
        dispatch_checks = 0
        search_started=None
        if checkpoint.get('search_resource')!=self.settings['resource']:
            checkpoint.pop('search_level',None)
            checkpoint.pop('resource_override',None)
        checkpoint['search_resource']=self.settings['resource']
        def confirmed_dispatch():
            nonlocal pending,authorized_march,dispatch_count_before
            pending=False;authorized_march=False;dispatch_count_before=None
            checkpoint.update(pending=False,authorized=False,before=None,reconcile=False)
            checkpoint.pop('search_level',None)
            checkpoint.pop('resource_override',None)
            if hasattr(self,'cycle'):
                self.cycle.confirm_dispatch()
                self.settings['resource']=self.cycle.current
                if hasattr(self,'journal') and getattr(self,'current_character',None):
                    self.journal.data['cursors'][self.current_character]=self.cycle.cursor
                    self.journal.save()
                else:
                    self.cfg.update(cycle_plan=self.cycle.plan,cycle_index=self.cycle.cursor)
                    self.save()
        while not self.stop.is_set():
            observation, screen, offset = self.detect()
            if self.settings['probe']:
                for key, point in observation.buttons.items():
                    if point:
                        cv2.circle(screen, tuple(map(int, point)), 12, (0, 255, 0), 2)
                        cv2.putText(screen, key, (int(point[0])+15, int(point[1])), cv2.FONT_HERSHEY_SIMPLEX, .6, (0, 255, 0), 2)
                path = ROOT / 'recognition-preview.png'
                cv2.imencode('.png', screen)[1].tofile(path)
                summary = 'Màn hình: ' + STATE_LABELS.get(observation.state, 'Chưa nhận diện')
                summary += f' | Hàng đợi: {observation.queue if observation.queue is not None else "chưa đọc được"}'
                summary += ' | Nút: ' + ', '.join(LABELS[k] for k, v in observation.buttons.items() if v)
                self.messages.put((path, summary))
                return
            state = observation.state
            if state!='search':search_started=None
            if state == 'loading':
                if not getattr(self,'loading_started_at',None):self.loading_started_at=time.monotonic()
                if time.monotonic()-self.loading_started_at>240:
                    raise RuntimeError('Game chưa tải xong sau 240 giây; không gửi Esc.')
                previous=None;repeats=0
                self.stop.wait(2)
                continue
            self.loading_started_at=None
            if state is None:
                unknown += 1
                if unknown >= 4:
                    cv2.imencode('.png', screen)[1].tofile(ROOT / 'recognition-error.png')
                    raise RuntimeError('Chưa xác định được màn hình. Bot đã tự lưu ảnh và nhật ký chẩn đoán.')
                self.stop.wait(2)
                continue
            unknown = 0
            repeats = repeats+1 if state == previous else 0
            if repeats >= 3:
                raise RuntimeError('Màn hình không chuyển sau thao tác: ' + STATE_LABELS[state])
            previous = state
            self.log('OCR: ' + STATE_LABELS[state])
            if state == 'inside':
                if not self.active() or self.stop.is_set():
                    return
                if not space_sent:
                    pg.press('space')
                    space_sent = True
            elif state == 'outside':
                if pending and not checkpoint.get('reconcile',False):
                    # A click alone is not proof of dispatch. Confirm the increase
                    # before advancing/persisting the resource cycle.
                    if observation.queue is None or dispatch_count_before is None or observation.queue <= dispatch_count_before:
                        dispatch_checks += 1
                        if dispatch_checks >= 3:
                            checkpoint['reconcile']=True
                            self.log('Không xác nhận được bộ đếm trên bản đồ — mở lại bảng hàng đợi để đối chiếu, giữ nguyên lượt tài nguyên.')
                        else:
                            self.log('Đang đọc lại số đạo quân để xác nhận xuất phát...')
                            previous = None
                            self.stop.wait(2)
                            continue
                    else:
                        dispatch_checks=0
                        confirmed_dispatch()
                space_sent = False
                if not pending and observation.queue is not None and observation.capacity is not None and observation.queue >= min(self.settings['armies'], observation.capacity):
                    if one_pass:
                        return observation.queue, observation.capacity
                    self.log(f'Đang có {observation.queue}/{observation.capacity} đạo quân. Chờ quân về...')
                    previous = None
                    self.stop.wait(self.settings['interval'])
                    continue
                if self.stop.is_set() or not self.active():
                    return
                if not search_sent:
                    pg.press('f')
                    search_sent = True
            elif state == 'search':
                search_sent = False
                if search_started is not None:
                    if time.monotonic()-search_started<3:
                        previous=None
                        if self.stop.wait(1):return
                        continue
                    level=getattr(self,'effective_level',self.settings['level'])
                    if level<=1:
                        old_resource=self.settings['resource']
                        resource=random.choice([r for r in ('food','wood','stone','gold') if r!=old_resource])
                        self.settings['resource']=resource
                        checkpoint.update(resource_override=resource,search_resource=resource,search_level=self.settings['level'])
                        self.log('Không tìm được '+LABELS[old_resource]+' ở cấp 1 — chuyển ngẫu nhiên sang '+LABELS[resource]+'.')
                    else:
                        checkpoint['search_level']=level-1
                        self.log(f'Tìm mỏ cấp {level} chưa có phản hồi — hạ xuống cấp {level-1} và tìm lại.')
                    search_started=None
                self.log('Lượt farm: ' + LABELS[self.settings['resource']])
                self.auto_click(self.settings['resource'], 'search')
                if self.stop.wait(.8):
                    return
                # Read the actual level after each change; never assume a slider minimum.
                last_level = None
                target_level=checkpoint.get('search_level',self.settings['level'])
                self.effective_level = target_level
                for _ in range(10):
                    current, _, _ = self.detect()
                    if current.state != 'search' or current.level is None:
                        raise RuntimeError('Không đọc được cấp mỏ sau khi chọn tài nguyên.')
                    if current.level == target_level:
                        break
                    if current.level == last_level:
                        self.effective_level = current.level
                        self.log(f'Cấp {target_level} chưa khả dụng. Tự dùng cấp {current.level}.')
                        break
                    last_level = current.level
                    self.auto_click('minus' if current.level > target_level else 'plus', 'search')
                    if self.stop.wait(.3):
                        return
                else:
                    raise RuntimeError('Không đặt được cấp mỏ yêu cầu.')
                self.auto_click('find', 'search')
                search_started=time.monotonic()
                previous=None
            elif state == 'deposit':
                if not observation.free:
                    raise RuntimeError('Không xác nhận được mỏ trống qua dòng Lính thu gom / Không có.')
                self.auto_click('gather', 'deposit')
            elif state == 'new':
                if observation.queue is None or observation.capacity is None:
                    raise RuntimeError('OCR không đọc được số đạo quân và giới hạn của tài khoản.')
                if pending:
                    if dispatch_count_before is None:
                        raise RuntimeError('Thiếu số đạo trước khi gửi; chưa tự xác nhận xuất phát.')
                    if observation.queue>dispatch_count_before:
                        confirmed_dispatch()
                        self.log('Đã xác nhận quân xuất phát bằng bộ đếm trong bảng hàng đợi.')
                        if observation.queue>=min(self.settings['armies'],observation.capacity) and one_pass:
                            return observation.queue,observation.capacity
                        CharacterNavigator(self).close_to_map()
                        previous=None;search_sent=False
                        continue
                    self.log('Số đạo trong bảng hàng đợi chưa tăng — thử gửi lại cùng lượt tài nguyên.')
                    pending=False;authorized_march=False;dispatch_count_before=None
                    checkpoint.update(pending=False,authorized=False,before=None,reconcile=False)
                if observation.queue >= min(self.settings['armies'], observation.capacity):
                    if one_pass:
                        return observation.queue, observation.capacity
                    self.log(f'Đang có {observation.queue} đạo quân. Chờ quân về...')
                    if self.stop.wait(self.settings['interval']):
                        return
                    # Refresh this panel via the map, rather than relying on a stale counter.
                    if not self.active():
                        raise RuntimeError('Game mất tiêu điểm.')
                    pg.press('esc')
                    previous = None
                else:
                    checkpoint.update(before=observation.queue,authorized=True)
                    fresh=self.auto_click('new_army', 'new')
                    dispatch_count_before = fresh.queue
                    authorized_march = True
            elif state == 'march':
                if not authorized_march:
                    raise RuntimeError('Hãy bắt đầu từ bản đồ; bot cần đọc hàng đợi trước khi xuất quân.')
                if pending:
                    raise RuntimeError('Chưa xác nhận xuất quân thành công.')
                self.auto_click('march', 'march')
                checkpoint.update(pending=True,authorized=False,before=dispatch_count_before)
                pending = True
                authorized_march = False
            self.stop.wait(.7)

    def update_character_table(self, current=None):
        rows = []
        for char in self.journal.data['characters']:
            identity = char['identity']
            if self.journal.completed(identity):
                done = self.journal.data['completed'][identity]
                status = f'Hoàn tất — {done["queue"]}/{done["capacity"]} đạo'
            elif identity == current:
                status = 'Đang xử lý'
            elif identity in self.journal.data['attempts']:
                status = 'Lỗi — chưa hoàn tất'
            else:
                status = 'Chờ đến lượt'
            rows.append(dict(char, status=status))
        self.messages.put(('characters', rows))

    def run_all_characters(self, one_round=False):
        if self.vision is None:
            self.log('Đang nạp mô hình OCR...')
            self.vision = Vision(ASSETS, ROOT / 'vision-cache')
        navigator = CharacterNavigator(self)
        signature = json.dumps({'allocations': self.settings['allocations'], 'level': self.settings['level']}, sort_keys=True)
        self.journal = RoundState(getattr(self, 'journal_path', ROOT / 'round-progress.json'), signature)
        if self.journal.data.get('next_at'):
            self.journal.schedule(self.settings['repeat_hours'])
        while not self.stop.is_set():
            next_at = self.journal.data.get('next_at')
            if next_at:
                if one_round and time.time() < next_at:
                    return
                while time.time() < next_at and not self.stop.is_set():
                    remaining = next_at-time.time()
                    self.messages.put(f'Đã hoàn tất tất cả nhân vật. Vòng tiếp theo sau {remaining/3600:.2f} giờ.')
                    self.stop.wait(min(30, remaining))
                if self.stop.is_set():
                    return
                self.journal.new_round()
                self.game.focus()
                if self.stop.wait(2):
                    return
            self.log('Bắt đầu/tiếp tục vòng ' + self.journal.data['round'][:8])
            saved_roster = self.journal.data.get('characters', [])
            if saved_roster:
                characters = [Character(c['identity'], c['name'], c['kingdom'], (0, 0)) for c in saved_roster]
                self.log(f'Dùng danh sách đã lưu: {len(characters)} nhân vật ngôi sao — không quét lại.')
            else:
                characters = navigator.scan()
                self.journal.roster(characters)
                self.log(f'Đã quét và lưu {len(characters)} nhân vật ngôi sao.')
            if hasattr(self, 'on_roster'):
                self.on_roster(characters)
            self.update_character_table()
            self.log(f'Đã tìm thấy {len(characters)} nhân vật ngôi sao. Không xử lý nhân vật thường.')
            attempts_this_run = {}
            while self.journal.pending() and not self.stop.is_set():
                candidates = [c for c in characters if not self.journal.completed(c.identity)
                              and attempts_this_run.get(c.identity, 0) < 3]
                if not candidates:
                    raise RuntimeError('Còn nhân vật chưa hoàn tất sau 3 lần thử. Tiến độ đã lưu; mở lại app để tiếp tục.')
                for character in candidates:
                    if self.stop.is_set():
                        return
                    self.current_character = character.identity
                    self.update_character_table(character.identity)
                    try:
                        navigator.select(character)
                        self.log('Đã đăng nhập vào tài khoản: ' + character.name + ' — #' + character.kingdom)
                        if self.settings.get('claim_alliance', True) and not self.journal.data['alliance_done'].get(character.identity):
                            if navigator.claim_alliance_optional():
                                self.journal.data['alliance_done'][character.identity] = True
                                self.journal.save()
                        self.cycle = FarmCycle(self.settings['allocations'], self.journal.data['cursors'].get(character.identity, 0))
                        self.settings['resource'] = self.cycle.current
                        self.dispatch_state={}
                        result = retry_step(self,'farm '+character.name,lambda:self.run_auto(one_pass=True),navigator.recover_loading_window) if '--offline' in sys.argv else self.run_auto(one_pass=True)
                        if self.stop.is_set():
                            return
                        if result is None:
                            raise RuntimeError('Chưa xác nhận được kết quả farm.')
                        self.journal.finish(character.identity, *result)
                        self.log(f'Đã farm/đủ hàng đợi: {character.name} — {result[0]}/{result[1]} đạo. Không đăng nhập lại trong vòng này.')
                    except Exception as error:
                        if self.stop.is_set():
                            return
                        self.journal.fail(character.identity, error)
                        self.log('Lỗi nhân vật ' + character.name + ': ' + str(error) + ' — thử lại sau 3 giây, chưa đánh dấu hoàn tất.')
                        if self.stop.wait(3):return
                        self.game=GameWindow.find();self.game.focus()
                        break
                    self.update_character_table()
            if self.stop.is_set():
                return
            navigator.close_to_map()
            deadline = self.journal.schedule(self.settings['repeat_hours'])
            self.current_character = None
            self.log(f'Hoàn tất tất cả nhân vật ngôi sao. Chờ {self.settings["repeat_hours"]:g} giờ đến vòng tiếp theo.')
            if one_round:
                return


if __name__ == '__main__':
    if '--check-https' in sys.argv:
        from startup_diagnostics import check_https
        sys.exit(check_https(ROOT))
    if '--check-ocr' in sys.argv:
        from startup_diagnostics import check_ocr
        sys.exit(check_ocr(ASSETS, ROOT))
    App()
