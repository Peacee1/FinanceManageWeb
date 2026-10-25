# ROK Farm Bot — LDPlayer v1

Đây là bản riêng cho cửa sổ LDPlayer; bản game PC vẫn dùng executable Fleet.

1. Mở LDPlayer, cài và mở Rise of Kingdoms bằng tiếng Việt. Dùng màn hình ngang, khuyến nghị 1600 × 900 hoặc 1280 × 720.
2. Chạy `ROKFarmBotLDPlayer_v1.exe`. Bấm **Chọn LDPlayer / cửa sổ giả lập**, chọn `ldconsole.exe` hoặc `dnconsole.exe` trong thư mục cài LDPlayer, rồi chọn instance đang chạy.
3. Trong Keyboard Mapping của LDPlayer, gán **O** vào nút Liên minh, **F** vào Tìm kiếm, **Space** vào nút Trong/Ngoài thành. **Esc** phải là Back của Android. Bot hiện dùng các phím này khi điều hướng; chưa tự thiết lập bàn phím giả lập.
4. Trên trang quản trị, tạo **client mới** và tải file ghép nối. Trong tool LDPlayer bấm **Kết nối web / VPS** rồi chọn file đó. Không dùng cùng file/token với client PC đang chạy.
5. Khởi chạy trên web. F8 dừng; giữ cửa sổ giả lập hiển thị và không thu nhỏ khi bot thao tác.

Ảnh được lấy từ vùng Android (bound window handle), bỏ khung và thanh công cụ LDPlayer. Client vẫn kiểm tra tiêu điểm trước khi bấm.

Dữ liệu riêng: `%LOCALAPPDATA%\ROKFarmBotLDPlayer`. Với chế độ tự kết nối `--fleet`, đặt file ghép nối vào thư mục này dưới tên `first-client.json`.

Đã kiểm tra bộ chọn backend, tách dữ liệu và parser nhiều instance. Chưa kiểm tra lượt farm thực tế trong LDPlayer; giao diện ROK Android có thể khác game PC và cần bổ sung mẫu nhận diện.

Tài liệu LDPlayer: https://www.ldplayer.net/support/introduction-to-ldplayer-command-line-interface.html
