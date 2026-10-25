# ROK Bot — PC

Phiên bản: v51. Dành cho Windows 64-bit; đã đóng kèm Python và OCR, không cần cài Python riêng.

1. Giải nén ZIP vào một thư mục riêng.
2. Mở Rise of Kingdoms bản PC, dùng giao diện tiếng Việt.
3. Mở `ROKFarmBotFleet_v51.exe`.
4. Lần đầu, bấm **Kết nối web / VPS** và chọn file ghép nối client được tải từ trang quản trị. Mỗi máy dùng file ghép nối riêng.
5. Bấm Khởi chạy trên web để giao việc. Giữ game hiển thị, không thu nhỏ cửa sổ. F8 hoặc nút Dừng để ngừng bot.

Dữ liệu client PC được lưu tại `%LOCALAPPDATA%\ROKFarmBot`.

Gói ZIP chỉ có chương trình và hướng dẫn; không kèm mật khẩu, token hoặc dữ liệu tài khoản của máy đóng gói.

## Nhật ký và ảnh chẩn đoán VPS
Bản này gửi log chi tiết theo lô về server (giữ 200 dòng mới nhất/client, chỉ quản trị xem). Khi có lỗi, client gửi tối đa một ảnh/phút và server chỉ giữ một ảnh lỗi mới nhất. Không gửi ảnh hộp đăng nhập.

Trong trang quản trị, bấm Nhật ký VPS để xem log hoặc Xem lỗi / ảnh mới nhất để xem lỗi. Bấm Chụp ảnh VPS để yêu cầu ảnh desktop mới của phiên Windows đang chạy bot. Ảnh chụp thủ công ghi đè ảnh thủ công cũ, không xóa ảnh lỗi. Client nhận lệnh qua heartbeat nên có thể chờ khoảng 15–30 giây.

Giữ file ghép nối đã có; thoát bản cũ rồi mở bản mới. Tính năng gửi ảnh cần bot đã mở được và kết nối server. Nếu app chưa khởi động được hoặc phiên Windows bị khóa/không chụp được, ảnh có thể không gửi được.

Nhật ký chi tiết có tọa độ click/kéo, lỗi điều khiển chuột/phím, kiểm tra mất tiêu điểm và thông tin phiên RDP/quyền admin. Không ghi nội dung gõ trên bàn phím. Đã gửi thao tác không đồng nghĩa game đã phản hồi.

PC v40: sửa thời hạn chờ đăng nhập bị cũ, giữ bước trở về bản đồ sau khi đã xác nhận tài khoản, chỉ nhận đúng nút Chuyển tài khoản, bổ sung khôi phục tiêu điểm Windows. Chưa xác nhận chạy thực tế trên VPS.


Khi đã xác nhận đúng email nhưng còn ở Trung Tâm Người Dùng, v40 nhận diện khung sáng và bấm X để đóng thay vì chỉ gửi Esc. Nếu nhận diện không rõ, bot giữ nguyên bước và thử lại, không tự chọn nút phía sau hộp thoại.

PC v40: mở rộng vùng nhận diện nút Tài khoản để không cắt mất nút khi cửa sổ game thay đổi kích thước trên VPS. Đã tái hiện bằng ảnh lỗi server: vùng cũ không thấy nút, vùng mới khớp 79%.


PC v40: bấm nút Tài khoản bằng nhấn/thả tách biệt, rồi chờ xác nhận Trung Tâm Người Dùng tối đa 20 giây. Chưa mở được hộp thì thử lại bước này; không tìm Chuyển tài khoản trên màn hình danh sách nhân vật.


PC v40: nhận diện hộp Đã ngắt kết nối mạng, tự bấm Xác nhận và chờ tải lại. Chỉ bấm khi đọc đúng hộp mạng và nút Xác nhận màu xanh duy nhất. Áp dụng cả lúc đăng nhập/chuyển nhân vật và farm, giữ tiến độ hiện tại; F8/Dừng vẫn ngắt được.


PC v40: nhận diện hai ô email/mật khẩu qua khung biểu mẫu khi placeholder đã mất. Nếu email đã nhập khớp tài khoản được giao, bỏ qua nhập email và tiếp tục mật khẩu. Vẫn giữ Ctrl+A khi cần thay nội dung ô và xác nhận email trước khi gửi đăng nhập.


PC v40: chờ hộp chọn tài khoản trước khi tìm Đăng nhập vào tài khoản khác. Ưu tiên đúng chữ trong hộp hiện tại, gộp OCR trùng cùng vị trí; nếu hai vị trí khác nhau vẫn chưa bấm. Thử lại từ hộp chọn đang mở, không mở lại menu game hoặc bấm nút phía sau biểu mẫu đăng nhập.


PC v40: khi email đã có trong biểu mẫu, nhận diện trực tiếp email đúng, nhãn ô mật khẩu và nút đăng nhập. Không yêu cầu placeholder email hay hai ô nền xám; chỉ nhập mật khẩu khi xác định duy nhất các thành phần này.


PC v40: nhận diện Bạn đã đăng nhập trên thiết bị khác, bấm Xác nhận, chờ ROK đóng, tìm launcher ROK đang mở và bấm nút Bắt đầu màu vàng một lần. Giữ launcher đã cài trên VPS đang mở (có thể thu nhỏ). Không tự tải hoặc chạy file launcher lạ. Chờ cửa sổ game mới, kiểm tra lại thống đốc đang xử lý rồi tiếp tục. F8/Dừng vẫn có hiệu lực; nếu launcher/nút Bắt đầu chưa tìm được, giữ bước và thử lại.



PC v41: bỏ phân loại hướng chữ OCR cho giao diện ngang. Xác nhận tên hiện tại trực tiếp trong hồ sơ thống đốc trước khi mở danh sách; sau chuyển nhân vật cũng kiểm tra tại hồ sơ. Tên số nhân vật vẫn phải khớp. Đã kiểm tra bằng ảnh mẫu, chưa xác nhận tốc độ thực tế trên VPS.

PC v42: ưu tiên bảng xuất quân khi tiêu đề và loại lính đã nhận diện, kể cả OCR mất chữ Hành quân. Đọc lại vùng nút phóng lớn; không bấm phím tìm kiếm vào nền bản đồ phía sau bảng này. Bao gồm cải tiến OCR và hồ sơ thống đốc của v41.

PC v43: khi bước xác nhận tên gặp Nhấn để bắt đầu / loading / hộp thoát, tiếp tục quy trình vào bản đồ rồi mới mở hồ sơ; không lặp lỗi xác nhận tên trên màn bắt đầu. Bao gồm sửa bảng xuất quân của v42.

PC v44: cứ 5 lỗi liên tiếp trong cùng bước, bấm Esc một lần rồi OCR lại và tiếp tục đúng bước đó; lặp tại lỗi thứ 10, 15... Giữ tiến độ. Không gửi Esc khi mất tiêu điểm hoặc đã Dừng. Bao gồm các sửa của v43.

PC v44: OCR bảng chat trước nền bản đồ, đóng chat bằng Esc và đọc lại trước khi cho phép gửi F. Không gửi nội dung chat.

Mốc 5 lỗi gửi ảnh/log chẩn đoán trước Esc. Kiểm tra lỗi gần nhất trên server trước khi tải ảnh; lỗi trùng được bỏ qua. Server giữ một ảnh lỗi mới nhất/VPS, ảnh chụp thủ công lưu riêng. Màn hình đăng nhập nhạy cảm chỉ gửi log, không gửi ảnh.

PC v45: sau Tìm kiếm, chờ ít nhất 3 giây; nếu vẫn ở bảng tìm mỏ thì hạ một cấp và tìm lại, tối thiểu cấp 1. Không đổi cấu hình đã lưu, không chuyển lượt tài nguyên trước khi xác nhận xuất quân. Bao gồm các sửa của v44.

Nếu cấp 1 vẫn không tìm được mỏ, chọn ngẫu nhiên một tài nguyên khác, tìm lại từ cấp ưu tiên; giữ lượt chưa hoàn tất đến khi xác nhận xuất quân.

PC v46: mở rộng vùng dò dấu tích xanh ở cạnh chân dung cho hàng nhân vật cao; nhận Bé Ti F2 đang hoạt động và không chuyển lại. Khi deadline cũ hết vẫn thử lấy lại tiêu điểm mỗi lần retry. Gói kèm Keep Remote v4.

PC v47: nhận hồ sơ nhỏ qua bộ đếm điểm hành động và bánh răng khi nhãn Thống đốc mất OCR; đọc tên ngay dưới bộ đếm trong hồ sơ đã xác nhận. Tránh mở/đóng avatar liên tục. Kèm Keep Remote v4.

PC v48: nhận hồ sơ qua bánh răng khớp rõ và bảng xanh khi cả nhãn và bộ đếm điểm hành động bị mất OCR. Giữ nguyên bảo vệ hộp đăng nhập, không đoán tên nhân vật.

PC v49: chữ Tìm kiếm khớp chính xác trên nền nút màu được nhận từ độ tin cậy 55%; ưu tiên bảng tìm kiếm trước các nhãn hành động bị đoán sai. Giữ hạ cấp khi tìm không phản hồi và đổi tài nguyên khi cấp 1 thất bại.

PC v50: nhận diện danh sách nhân vật khi OCR thiếu dấu # trước vương quốc và đọc sai nhẹ tiêu đề. Giữ đối chiếu số F để không chọn nhầm nhân vật.

PC v51: heartbeat khởi động độc lập trước OCR. Khi OCR đang tải, client báo loading; chỉ farm sau khi OCR sẵn sàng. Lỗi khởi tạo OCR và heartbeat được ghi rõ trong nhật ký. Có thể chạy EXE với --check-ocr để kiểm tra OCR đóng gói mà không thao tác game; kết quả lưu tại %LOCALAPPDATA%\ROKFarmBot\ocr-startup-check.json.
