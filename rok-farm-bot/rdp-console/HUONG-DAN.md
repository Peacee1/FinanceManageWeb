# Giữ bot khi ngắt Remote Desktop

Bản v4: sau khi chuyển console, chờ Windows dựng lại màn hình rồi đưa cửa sổ game ROK về vùng desktop và phóng to. Nếu game chưa mở, nhận launcher qua file launcher.exe trong thư mục ROKLauncher và phóng to launcher thay thế. Kiểm tra lại sau 2, 5, 10 và 20 giây để tránh game tự co trong lúc chuyển phiên. Thử đặt console 1920×1080 nếu driver liệt kê và chấp nhận chế độ này; không ghi độ phân giải vào registry. Nếu không hỗ trợ, vẫn phóng to game và ghi rõ trong `keep-remote-result.log`. Đây là phóng to cửa sổ, không ép chế độ exclusive fullscreen của game.

Tiện ích dành cho VPS Windows đang chạy game và bot trong cùng phiên RDP.

1. Chép và giải nén gói này **trên VPS**. Giữ bot và game mở.
2. Nhấp phải `NGAT-REMOTE-GIU-BOT.cmd`, chọn **Run as administrator**. Tự xác nhận hộp quyền Windows nếu có.
3. Kết nối Remote Desktop sẽ ngắt. Tiện ích chuyển đúng phiên hiện tại sang console bằng `tscon`; không đăng xuất, không tắt bot/game. Dùng tiện ích này thay cho đóng cửa sổ RDP mỗi lần rời VPS.
4. Chờ 30–60 giây rồi mở trang quản trị từ máy cá nhân: kiểm tra log mới và bấm Chụp ảnh VPS. Chỉ coi là thành công khi có ảnh mới và log thao tác game tiếp tục trong lúc RDP đã ngắt.
5. Khi cần, kết nối Remote Desktop trở lại như bình thường.

Tiện ích không đổi cấu hình sleep, khóa màn hình, mật khẩu, chính sách bảo mật hoặc tự đăng nhập. Không nhập/lưu mật khẩu. Không chuyển phiên của người khác. Chuyển sang console để lại phiên desktop đang đăng nhập; chỉ dùng trên VPS riêng mà bạn quản lý, không dùng máy chia sẻ.

Nếu Windows từ chối hoặc vẫn không chụp/điều khiển được sau khi ngắt: VPS có thể không cung cấp màn hình console hoạt động. Nhờ nhà cung cấp kiểm tra console/hiển thị ảo hoặc truy cập VNC. Tiện ích không bảo đảm mọi VPS đều hỗ trợ, và không thay thế kiểm tra thực tế trên VPS.

Tham khảo: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tscon

V4 ghi kích thước thực tế cửa sổ và vùng làm việc vào log. Không tự bấm Bắt đầu, không tự đóng game hoặc launcher. Có thể dùng cùng client v45 hiện tại; giải nén gói mới vào thư mục riêng để tránh trộn file v3. Chưa kiểm chứng trực tiếp trên VPS của bạn.
