# ROK Bot — PC Offline v1

Dành cho Rise of Kingdoms bản PC trên Windows 64-bit. Không dùng cho LDPlayer hoặc BlueStacks. Đã đóng kèm Python và OCR.

## Sử dụng
1. Giải nén toàn bộ ZIP vào một thư mục.
2. Mở và đăng nhập game ROK bản PC, giao diện tiếng Việt.
3. Mở ROKFarmBotPCOffline_v1.exe.
4. Chọn số đạo cho từng tài nguyên (0 để bỏ qua), cấp mỏ ưu tiên và thời gian lặp. Tổng từ 1 đến 7, bot đối chiếu giới hạn thực tế trong game.
5. Bấm Bắt đầu. Bot quét các nhân vật ngôi sao của tài khoản game đang đăng nhập, nhận tài nguyên liên minh nếu có, lần lượt farm và lặp theo thời gian đã chọn. Không tự chuyển giữa các email đăng nhập.
6. F8 hoặc Dừng để dừng. Giữ game hiển thị, không thu nhỏ trong lúc bot thao tác.

Bot không kết nối web quản lý, không cần mã kích hoạt hoặc file ghép nối. Game ROK vẫn cần kết nối Internet. Không kèm tài khoản/mật khẩu/token trong gói phát hành.

Cấu hình, nhật ký và tiến độ được lưu riêng tại %LOCALAPPDATA%\ROKFarmBotPCOffline. Clear data / Reset bot chỉ reset dữ liệu bot. Mở lại app giữ tiến độ vòng chạy; đổi cấu hình sẽ bắt đầu vòng mới.

Bản dùng OpenCV headless, không phụ thuộc Media Foundation của Windows Server.
