from pathlib import Path

path = Path(__file__).with_name('bot.py')
source = path.read_text('utf-8')
start = source.index('        panel = ttk.Frame(self.root, padding=12)')
end = source.index("        keyboard.add_hotkey('f8', self.stop.set)", start)
replacement = '''        panel = ttk.Frame(self.root, padding=16)
        panel.pack(fill='both', expand=True)
        ttk.Label(panel, text='ROK FARM — TỰ ĐỘNG', font=('Segoe UI', 20, 'bold')).pack(anchor='w')
        ttk.Label(panel, text='Tự tìm game • Trong thành → Space • Ngoài thành → F').pack(anchor='w', pady=8)
        tabs = ttk.Notebook(panel)
        tabs.pack(fill='both', expand=True, pady=10)
        settings = ttk.Frame(tabs, padding=15)
        guide = ttk.Frame(tabs, padding=15)
        tabs.add(settings, text='Cấu hình farm')
        tabs.add(guide, text='Hướng dẫn')
        for label, variable, values in [('Tài nguyên', self.resource, list(RESOURCES)),
                                         ('Cấp mỏ ưu tiên', self.level, list(range(1, 9))),
                                         ('Giới hạn đạo quân đang hoạt động', self.armies, list(range(1, 6)))]:
            ttk.Label(settings, text=label).pack(anchor='w', pady=(10, 4))
            ttk.Combobox(settings, textvariable=variable, values=values, state='readonly').pack(fill='x')
        ttk.Label(settings, text='Thời gian kiểm tra lại (giây)').pack(anchor='w', pady=(10, 4))
        ttk.Entry(settings, textvariable=self.interval).pack(fill='x')
        ttk.Label(settings, text='Tự đọc số đạo quân tối đa và cấp mỏ khả dụng.\\nKhông cần chọn cửa sổ, đánh dấu nút hay hiệu chỉnh ảnh.', wraplength=520).pack(anchor='w', pady=16)
        ttk.Label(guide, text='1. Mở game và đăng nhập.\\n\\n2. Chọn tài nguyên, cấp mỏ và giới hạn đạo quân.\\n\\n3. Bấm Bắt đầu. App tự đưa game lên trước, xác định trong/ngoài thành, bấm Space nếu cần rồi F để tìm kiếm.\\n\\n4. Bot tự tìm mỏ, thu thập, tạo quân và hành quân, sau đó lặp lại.\\n\\n5. F8 dừng. Nếu chuyển sang ứng dụng khác, bot dừng để tránh thao tác nhầm.\\n\\nKhông cần hiệu chỉnh thủ công. Tướng và lính do game tự chọn. Nếu cấp ưu tiên chưa khả dụng, dùng cấp cao nhất có thể chọn.', wraplength=520, justify='left').pack(anchor='w')
        ttk.Button(guide, text='Mở nhật ký và ảnh chẩn đoán', command=lambda: os.startfile(ROOT)).pack(fill='x', pady=15)
        self.item_keys = {}
        self.progress = tk.StringVar()
        ttk.Button(panel, text='Bắt đầu — tự vào game và farm', command=self.start).pack(fill='x', pady=4)
        ttk.Button(panel, text='Dừng (F8)', command=self.stop.set).pack(fill='x')
        ttk.Label(panel, textvariable=self.status, wraplength=560).pack(pady=10)
'''
path.write_text(source[:start] + replacement + source[end:], 'utf-8')
