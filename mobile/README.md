# Peacee1 Mobile

App Android và iPhone viết bằng Expo + React Native + TypeScript, nằm riêng với `frontend/` và dùng backend Peacee1 hiện có. Đây là bản khởi đầu phát triển app, chưa phải bản phát hành trên kho ứng dụng.

## Chạy trên điện thoại

```powershell
cd mobile
npm ci
npm start
```

Dùng Expo Go hỗ trợ SDK 57 để quét mã QR, điện thoại và máy tính cùng mạng. Nếu Expo Go chưa hỗ trợ SDK này, dùng development build tương ứng thay vì hạ phiên bản thư viện riêng lẻ. Simulator iOS cần macOS; Windows có thể phát triển cho iPhone qua Expo Go hoặc bản development build.

Mặc định kết nối `https://finance.peacee1.io.vn/api`. Có thể copy `.env.example` thành `.env` để đổi API; địa chỉ public không chứa khóa bí mật. Khi dùng backend trên máy tính, dùng IP LAN của máy thay cho `localhost` trên điện thoại và chỉ bật HTTP trong môi trường phát triển tin cậy.

## Các chức năng đã nối API

- Đăng nhập/đăng ký email và mật khẩu; lưu phiên bằng SecureStore trên Android/iOS; phiên hết hạn quay về đăng nhập.
- Tổng quan và lịch thu chi theo tháng; tải hết các trang giao dịch để phân tích không bị cắt ở trang đầu.
- Thêm khoản thu/chi, danh mục và nguồn tiền theo cấu hình tài khoản. Backend tự áp dụng sổ Cá nhân hoặc Gia đình.
- Phân tích danh mục với biểu đồ vòng tròn và tỷ lệ chi tiêu.
- Gia đình: tạo/tham gia, đồng bộ thu chi, danh sách thành viên, mua slot, rời/giải tán theo quyền người tạo.
- Giao diện sáng/tối/hệ thống, 5 màu chủ đạo đồng bộ tài khoản như web; Tiếng Việt, English, Trung, Nhật, Hàn. Theme và ngôn ngữ lưu trên thiết bị. Nội dung người dùng và thông báo từ máy chủ giữ nguyên ngôn ngữ gốc.
- Điểm danh hằng ngày: thẻ điểm danh 7 ngày, thưởng theo backend (20/100/500 xu), tiến độ ghi thu chi thật, lối vào từ Trang chủ và Hồ sơ.
- Hồ sơ, chuông thông báo và đánh dấu đã đọc.
- Mục tiêu tiết kiệm: tạo, góp/rút và lịch sử người đóng góp, không ghi góp/rút vào sổ thu chi.

Design được điều chỉnh để bỏ hạng thành viên giả, nút xã hội chưa nối OAuth và các phần không có dữ liệu thật. Số trên thẻ tổng quan là **chênh lệch thu chi tháng**, không phải tổng tiền trong tài khoản ngân hàng. Thông báo sự kiện hiện trong app. Nhắc điểm danh 07:00 và ghi chi tiêu 21:00 là thông báo được hệ điều hành điện thoại lên lịch lặp hằng ngày (giờ thiết bị), hoạt động khi app không mở. App xin quyền lần mở đầu; lịch được tạo sau đăng nhập và cập nhật theo ngôn ngữ. Đăng xuất hủy hai lịch nhắc. Bản xem thử trên trình duyệt không nhận thông báo điện thoại. Cần build lại Android/iOS sau khi thêm plugin expo-notifications và thử quyền/giờ nhận trên thiết bị thật. Bản đồ và nghiệp vụ doanh nghiệp chưa có giao diện native ở bản đầu.

## Xem giao diện trên máy tính

Chạy `npm run web` trong thư mục `mobile`. Đăng ký hoặc đăng nhập tài khoản Peacee1 để dùng dữ liệu thật. Tài khoản mới bắt đầu với sổ thu chi trống. Phiên đăng nhập trên web nằm trong bộ nhớ; tải lại trang sẽ cần đăng nhập lại.

## Kiểm tra và build

```powershell
npm run typecheck
npm test
npm run export:native
npx expo-doctor
```

`export:native` kiểm tra bundle Android/iOS; không tạo APK/IPA. `eas.json` chuẩn bị các profile build, nhưng cần liên kết tài khoản/dự án Expo và thông tin ký app trước khi tạo bản cài đặt. Không cấu hình chứng chỉ hoặc đăng lên kho ứng dụng tự động.

Audit của dependency Expo SDK 57 hiện báo lỗi `node-forge` trong công cụ ký/CLI với phiên bản mới nhất 1.4.0 chưa có bản vá. Không dùng `npm audit fix --force` vì gợi ý downgrade Expo không tương thích. Override `xcode -> uuid@11.1.1` xử lý advisory uuid và vẫn giữ API CommonJS mà xcode sử dụng. Cần rà lại audit và công cụ ký trước khi phát hành chính thức.

Tài liệu: [Expo](https://docs.expo.dev/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).





