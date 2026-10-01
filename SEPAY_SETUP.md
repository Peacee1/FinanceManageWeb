# Kết nối nhận tiền SePay

Tích hợp tạo QR cho khoản thu chuyển khoản của doanh nghiệp, nhận webhook HMAC và đối soát tiền vào. MB Bank là lựa chọn mặc định; chủ quán có thể chọn ngân hàng khác trong danh sách. Đây là xác nhận tiền vào qua SePay, không phải quyền đăng nhập ngân hàng hay tự chuyển tiền đi.

## Kích hoạt khi có tên miền

1. Trỏ DNS tới AWS và bật HTTPS cho website/API bằng chứng chỉ hợp lệ. Nginx phải ghi đè `X-Forwarded-Proto $scheme`; Express chỉ tin proxy loopback. Không bật kết nối trên HTTP.
2. Đặt `PAYMENT_PUBLIC_URL=https://ten-mien-cua-ban` trong `backend/.env`, không thêm đường dẫn. `remote_deploy.sh` tạo `PAYMENT_SECRET_KEY` ngẫu nhiên nếu chưa có. Giữ nguyên khoá này qua các lần deploy và sao lưu riêng an toàn; đổi khoá làm mất khả năng đọc khoá webhook đã mã hoá. Khởi động lại backend sau khi cập nhật cấu hình.
3. Chủ quán liên kết tài khoản ngân hàng thật trên SePay Live. Trong tab **Ngân hàng**, nhập đúng ngân hàng, số tài khoản và tên tài khoản; lưu kết nối với tuỳ chọn bật đang tắt.
4. Sao chép URL webhook và khoá HMAC được hiển thị một lần sang cấu hình webhook JSON của SePay Live. Chọn xác thực HMAC với `X-SePay-Signature` và `X-SePay-Timestamp`. Hệ thống kiểm tra SHA-256 của `timestamp.raw_body`, sai chữ ký hoặc quá 5 phút sẽ bị từ chối. Gửi thông báo tiền vào; hệ thống bỏ qua khoản tiền ra. Mã thanh toán bắt đầu bằng `CF`, theo sau là 20 ký tự hexadecimal; hệ thống đọc mã từ nội dung chuyển khoản đầy đủ.
5. Sau khi webhook đã cấu hình đúng, bật kết nối và xác nhận đang dùng đúng tài khoản SePay Live. Kiểm tra một khoản chuyển tiền thật nhỏ: đúng tài khoản, đúng số tiền, đúng mã, trạng thái ngân hàng đã xác nhận; kiểm tra doanh thu sau khi chủ quán duyệt.

Tài liệu chính thức: [Webhook](https://developer.sepay.vn/vi/sepay-webhooks), [xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [QR](https://developer.sepay.vn/vi/sepay-webhooks/tao-qr-va-form-thanh-toan).

## Quy tắc ghi nhận

- Kết nối chưa bật: giao dịch giữ cách ghi nhận hiện tại. Giao dịch cũ giữ trạng thái thủ công, không được gắn nhãn ngân hàng đã xác nhận.
- Kết nối đã bật: khoản thu chuyển khoản tạo yêu cầu chờ xác nhận và QR có số tiền/mã riêng. Thu tiền mặt, khoản chi và giao dịch cá nhân không tạo QR ngân hàng.
- Chờ xác nhận không được tính vào tổng doanh thu, lịch doanh nghiệp hoặc danh sách giao dịch tài chính đã duyệt. Xác nhận ngân hàng và duyệt của chủ quán là hai trạng thái riêng.
- Webhook trùng cùng mã giao dịch SePay không ghi nhận thêm tiền. Chuyển khoản thứ hai cùng mã được đưa vào danh sách đối soát, không cộng thêm doanh thu tự động.
- QR hết hạn sau 15 phút. Thông báo đến muộn vẫn được xử lý nếu thời gian chuyển khoản nằm trong thời hạn. Chuyển tiền sau thời hạn, thiếu mã hoặc sai số tiền cần chủ quán kiểm tra. Không tự cộng các khoản chuyển một phần.
- Chỉ chủ quán đối soát thủ công; phải khớp kết nối, tài khoản, chiều tiền vào, số tiền và yêu cầu chưa huỷ/chưa thanh toán. Việc đối soát có thể chấp nhận khoản đến sau thời hạn, được ghi nhận người thực hiện.
- Bàn phụ thu chờ chuyển khoản vẫn có khách. Phí được chốt tại thời điểm lấy bảng phí; khi nhận tiền hợp lệ bàn mới đóng. Muốn đổi sang tiền mặt phải huỷ yêu cầu chuyển khoản và lấy bảng phí mới.
- Huỷ yêu cầu không hoàn tiền ngân hàng và không hoàn kho hàng đã bán. Khoản đã nhận tiền không thể huỷ. Chuyển tiền đến sau khi huỷ được giữ trong lịch sử ngân hàng để chủ quán xử lý.
- Không thể sửa/xoá giao dịch do tích hợp ngân hàng quản lý qua API thu chi thông thường. Không đổi tài khoản/tắt kết nối/đổi khoá khi còn yêu cầu đang chờ; cần đối soát hoặc huỷ trước.

## Kiểm tra và giới hạn

`npm test` chạy kiểm tra chữ ký, mã hoá và logic hiện có. `RUN_DB_TESTS=1 npm test` chạy kiểm tra tích hợp PostgreSQL bằng tài khoản thử riêng và webhook có chữ ký; không gọi ngân hàng thật. Website chỉ sẵn sàng nhận tiền thật sau khi có HTTPS, tài khoản liên kết và kiểm tra Live thành công.

Thiết kế dùng chỉ mục, phân trang 50 bản ghi, giao dịch DB và khoá chống xử lý trùng. Chưa kiểm chứng tải 10 triệu MAU; cần đo tải thực tế, nhiều instance backend, PostgreSQL đủ công suất và kế hoạch lưu trữ/phân vùng lịch sử theo tốc độ giao dịch trước khi đạt quy mô đó.
