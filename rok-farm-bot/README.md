# ROK Farm Bot

Mã nguồn client Windows cho Rise of Kingdoms: PC online v52, LDPlayer v18 và PC offline v1.

## Chạy và build

- Python 3.12 trên Windows. Tạo môi trường ảo và cài `requirements.txt`.
- Chạy PC: `python bot.py`; LDPlayer: `python ldplayer_bot.py`; offline: `python pc_offline_bot.py`.
- Build: `build.bat PC`, `build.bat LD`, hoặc `build.bat OFFLINE`.
- Spec chỉ giữ phiên bản hiện tại. File EXE/ZIP, môi trường Python và dữ liệu chạy không nằm trong Git.
- Keep Remote v4 nằm trong `rdp-console/`. Đọc hướng dẫn trong đó trước khi chạy trên VPS.

## Kiểm tra

Các bài unit test nằm trong `test_*.py`. Một số bài hồi quy ảnh và công cụ probe cần ảnh cục bộ trong `live-fixtures/`, `ldplayer-captures/` hoặc đường dẫn ảnh gốc. Các ảnh chẩn đoán thực tế không được đưa lên Git để tránh lộ thông tin người dùng; vì vậy toàn bộ test ảnh không thể chạy từ checkout mới nếu chưa cung cấp fixture an toàn.

Không commit JSON ghép nối, token client, mật khẩu, log, ảnh VPS hoặc cấu hình người dùng.
