import React, { createContext, useContext } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import {categoryLabel,monthLabel} from './localizedLabels';
export type Language = 'vi' | 'en' | 'zh' | 'ja' | 'ko' | 'ru';
export const languages = [{value:'vi',label:'Tiếng Việt'},{value:'en',label:'English'},{value:'zh',label:'中文'},{value:'ja',label:'日本語'},{value:'ko',label:'한국어'},{value:'ru',label:'Русский'}];
export const LanguageContext = createContext<Language>('en');
// Vietnamese source labels map to English, Chinese, Japanese and Korean.
const rows = [
['Đen trắng','Black & white'],
['Chi tiêu tháng này','Spending this month'],
['Phân tích chi tiêu','Spending analysis'],
['Chi tiêu theo thành viên','Spending by member'],
['Chi tiêu lũy kế trong tháng','Cumulative spending this month'],
['Chưa có khoản chi. Thêm khoản chi để bắt đầu.','No expenses yet. Add an expense to get started.'],
['Chỉ quản lý khoản chi','Track expenses only'],
['Quản lý thu chi','Income and expense tracking'],
['Đang bật · Chỉ hiển thị khoản chi trong trang chủ, lịch và báo cáo.','Enabled · Only expenses appear on Home, Calendar and Reports.'],
['Đang tắt · Có thể thêm cả khoản thu và khoản chi.','Disabled · Track both income and expenses.'],
['Khoản thu đã ghi vẫn được lưu. Tắt tùy chọn này để xem và quản lý lại khoản thu.','Existing income is saved. Disable this option to view and manage it again.'],
['Màu chủ đạo áp dụng cho nền, nút và điểm nhấn. Màu danh mục, thu chi và biểu đồ được giữ riêng.','The accent applies to backgrounds, buttons and highlights. Categories, income, expenses and charts keep their own colors.'],
["Sửa giao dịch","Edit transaction","编辑交易","取引を編集","거래 수정","Изменить транзакцию"],
["Xoá giao dịch","Delete transaction","删除交易","取引を削除","거래 삭제","Удалить транзакцию"],
["Xoá giao dịch?","Delete this transaction?","删除这笔交易？","この取引を削除しますか？","이 거래를 삭제할까요?","Удалить эту транзакцию?"],
["Giao dịch sẽ bị xoá khỏi sổ thu chi. Bạn có chắc chắn không?","This transaction will be removed from your ledger. Are you sure?","此交易将从账本中删除。确定吗？","この取引は帳簿から削除されます。よろしいですか？","거래가 장부에서 삭제됩니다. 계속할까요?","Транзакция будет удалена из журнала. Вы уверены?"],
["Thao tác giao dịch","Transaction actions","交易操作","取引の操作","거래 작업","Действия с транзакцией"],
["Sửa","Edit","编辑","編集","수정","Изменить"],
["Xoá","Delete","删除","削除","삭제","Удалить"],
["QUẢN LÝ TÀI CHÍNH","FINANCE MANAGEMENT","财务管理","家計管理","재무 관리","УПРАВЛЕНИЕ ФИНАНСАМИ"],
["Peacee1 · Đồng hành cùng thói quen tài chính của bạn","Peacee1 · Supporting your financial habits","Peacee1 · 陪伴您养成理财习惯","Peacee1 · あなたの家計習慣をサポート","Peacee1 · 금융 습관을 함께 만들어 갑니다","Peacee1 · Помогаем развивать финансовые привычки"],
["Nhận xét thu chi · 100 xu","Review finances · 100 coins","分析收支 · 100金币","収支を分析 · 100コイン","수입·지출 분석 · 100코인","Анализ финансов · 100 монет"],
["Cập nhật nhận xét · 100 xu","Refresh review · 100 coins","更新分析 · 100金币","レビューを更新 · 100コイン","분석 새로고침 · 100코인","Обновить анализ · 100 монет"],
["Bạn cần ít nhất 100 xu để nhận xét AI.","You need at least 100 coins for an AI review.","AI分析至少需要100金币。","AIレビューには100コインが必要です。","AI 분석에는 최소 100코인이 필요합니다.","Для AI-анализа нужно минимум 100 монет."],
["Gia đình đã đủ chỗ. Mua thêm slot để mời người mới.","The family is full. Add a slot to invite someone new.","家庭成员名额已满，请购买名额后邀请新成员。","家族の枠が満員です。招待するには枠を追加してください。","가족 정원이 찼습니다. 새 구성원을 초대하려면 자리를 추가하세요.","Все места заняты. Добавьте место, чтобы пригласить нового участника."],
["Nhân viên không thể tham gia Gia đình.","Employees cannot join a Family.","员工无法加入家庭。","従業員はファミリーに参加できません。","직원은 가족에 가입할 수 없습니다.","Сотрудники не могут присоединиться к Семье."],
["Lựa chọn đồng bộ không hợp lệ.","Invalid sync selection.","同步选择无效。","同期の選択が無効です。","동기화 선택이 유효하지 않습니다.","Неверный выбор синхронизации."],
["Bạn đã sử dụng chế độ Gia đình.","You have used Family mode.","您已使用家庭模式。","ファミリーモードを使用しました。","가족 모드를 사용했습니다.","Вы использовали семейный режим."],
["Vui lòng chọn đồng bộ sau giải tán trước khi tham gia Gia đình mới.","Please select sync after disbanding before joining a new Family.","加入新家庭前，请在解散后选择同步。","新しいファミリーに参加する前に、解散後に同期を選択してください。","새 가족에 가입하기 전에 해산 후 동기화를 선택하십시오.","Пожалуйста, выберите синхронизацию после расформирования перед присоединением к новой Семье."],
["Tên gia đình cần từ 1 đến 100 ký tự.","Family name must be between 1 and 100 characters.","家庭名称必须在1到100个字符之间。","ファミリー名は1〜100文字である必要があります。","가족 이름은 1자에서 100자 사이여야 합니다.","Название Семьи должно содержать от 1 до 100 символов."],
["Mã mời không hợp lệ.","Invalid invitation code.","邀请码无效。","招待コードが無効です。","초대 코드가 유효하지 않습니다.","Неверный код приглашения."],
["Không tìm thấy gia đình với mã mời này.","Family not found with this invitation code.","找不到该邀请码对应的家庭。","この招待コードのファミリーは見つかりませんでした。","이 초대 코드로 가족을 찾을 수 없습니다.","Семья с таким кодом приглашения не найдена."],
["Bạn chưa tham gia Gia đình hoặc gia đình đã giải tán.","You have not joined a Family or the family has been disbanded.","您尚未加入家庭或家庭已被解散。","ファミリーに参加していないか、ファミリーが解散されました。","가족에 가입하지 않았거나 가족이 해산되었습니다.","Вы не присоединились к Семье или Семья была расформирована."],
["Chỉ người tạo Gia đình mới có thể giải tán.","Only the Family creator can disband.","只有家庭创建者可以解散。","ファミリー作成者のみが解散できます。","가족 생성자만 해산할 수 있습니다.","Только создатель Семьи может расформировать её."],
["Gia đình đã được giải tán.","Family has been disbanded.","家庭已被解散。","ファミリーは解散されました。","가족이 해산되었습니다.","Семья была расформирована."],
["Không tìm thấy thông báo.","Notification not found.","找不到通知。","通知が見つかりません。","알림을 찾을 수 없습니다.","Уведомление не найдено."],
["Bạn cần ở chế độ Cá nhân để đồng bộ.","You need to be in Personal mode to sync.","您需要处于个人模式才能同步。","同期するにはパーソナルモードである必要があります。","동기화하려면 개인 모드여야 합니다.","Вам нужно быть в Личном режиме для синхронизации."],
["Đã lưu lựa chọn đồng bộ.","Sync selection saved.","同步选择已保存。","同期の選択が保存されました。","동기화 선택이 저장되었습니다.","Выбор синхронизации сохранен."],
["Mã yêu cầu mua slot không hợp lệ.","Invalid slot purchase request code.","槽位购买请求码无效。","スロット購入リクエストコードが無効です。","슬롯 구매 요청 코드가 유효하지 않습니다.","Неверный код запроса на покупку слота."],
["Bạn cần tham gia Gia đình để mua slot.","You need to join a Family to purchase slots.","您需要加入家庭才能购买槽位。","スロットを購入するにはファミリーに参加する必要があります。","슬롯을 구매하려면 가족에 가입해야 합니다.","Вам нужно присоединиться к Семье, чтобы покупать слоты."],
["Gia đình đã bị giải tán.","The family has been disbanded.","家庭已解散。","家族は解散されました。","가족이 해산되었습니다.","Семья была расформирована."],
["Mã yêu cầu đã dùng cho Gia đình khác.","The request code has been used for another Family.","请求码已被其他家庭使用。","リクエストコードは他の家族に使用されています。","요청 코드가 다른 가족에게 사용되었습니다.","Код запроса уже использован для другой Семьи."],
["Bạn cần ít nhất 1.500 xu để mua thêm một slot.","You need at least 1,500 coins to buy an extra slot.","您至少需要 1,500 金币才能购买额外槽位。","追加スロットを購入するには少なくとも1,500コインが必要です。","추가 슬롯을 구매하려면 최소 1,500 코인이 필요합니다.","Вам нужно минимум 1500 монет, чтобы купить дополнительный слот."],
["Đã mua thêm một slot Gia đình với 1.500 xu.","Successfully bought an extra Family slot with 1,500 coins.","已用 1,500 金币成功购买额外家庭槽位。","1,500コインで家族スロットを追加購入しました。","1,500 코인으로 가족 슬롯을 추가 구매했습니다.","Дополнительный слот Семьи успешно куплен за 1500 монет."],
["Bạn chưa tham gia Gia đình.","You have not joined a Family yet.","您尚未加入家庭。","まだ家族に参加していません。","아직 가족에 가입하지 않았습니다.","Вы еще не вступили в Семью."],
["Người tạo cần giải tán Gia đình thay vì rời.","The creator needs to disband the Family instead of leaving.","创建者需要解散家庭而不是离开。","作成者は脱退ではなく家族を解散する必要があります。","생성자는 탈퇴 대신 가족을 해산해야 합니다.","Создатель должен расформировать Семью, а не покидать ее."],
["Bạn đã rời Gia đình.","You have left the Family.","您已离开家庭。","家族から脱退しました。","가족을 탈퇴했습니다.","Вы покинули Семью."],
["Lỗi server","Server error","服务器错误","サーバーエラー","서버 오류","Ошибка сервера"],
["Xác thực email thành công!","Email verification successful!","邮箱验证成功！","メール認証に成功しました！","이메일 인증 성공!","Верификация email прошла успешно!"],
["Vui lòng nhập số điện thoại","Please enter your phone number","请输入手机号码","電話番号を入力してください","전화번호를 입력해주세요","Пожалуйста, введите номер телефона"],
["Đã thêm số điện thoại","Phone number added","手机号码已添加","電話番号が追加されました","전화번호가 추가되었습니다","Номер телефона добавлен"],
["Xác thực SĐT thành công!","Phone number verification successful!","手机号码验证成功！","電話番号の認証に成功しました！","전화번호 인증 성공!","Верификация номера телефона прошла успешно!"],
["Gói không hợp lệ.","Invalid package.","套餐无效。","パッケージが無効です。","유효하지 않은 패키지입니다.","Неверный пакет."],
["Không đủ coin hoặc lộ trình nâng cấp không hợp lệ.","Insufficient coins or invalid upgrade path.","金币不足或升级路径无效。","コイン不足またはアップグレードパスが無効です。","코인이 부족하거나 업그레이드 경로가 유효하지 않습니다.","Недостаточно монет или неверный путь обновления."],
["Nâng cấp thành công.","Upgrade successful.","升级成功。","アップグレードに成功しました。","업그레이드 성공.","Обновление прошло успешно."],
["Bạn đã điểm danh hôm nay rồi!","You have already checked in today!","您今天已经签到过了！","今日はすでにチェックイン済みです！","오늘 이미 출석 체크를 하셨습니다!","Вы уже отметились сегодня!"],
["Vui lòng chọn một file ảnh","Please select an image file","请选择一个图片文件","画像ファイルを選択してください","이미지 파일을 선택해주세요","Пожалуйста, выберите файл изображения"],
["Cập nhật ảnh đại diện thành công","Avatar updated successfully","头像更新成功","アバターを更新しました","프로필 사진이 성공적으로 업데이트되었습니다","Аватар успешно обновлен"],
["Lưu thông tin thành công","Information saved successfully","信息保存成功","情報を保存しました","정보가 성공적으로 저장되었습니다","Информация успешно сохранена"],
["Không đủ coin để thêm danh mục.","Not enough coins to add a category.","金币不足，无法添加分类。","カテゴリーを追加するためのコインが不足しています。","카테고리를 추가할 코인이 부족합니다.","Недостаточно монет для добавления категории."],
["Cập nhật danh mục thành công.","Category updated successfully.","分类更新成功。","カテゴリーを更新しました。","카테고리가 성공적으로 업데이트되었습니다.","Категория успешно обновлена."],
["Đơn vị tiền tệ không hợp lệ.","Invalid currency.","货币无效。","無効な通貨です。","유효하지 않은 통화입니다.","Недопустимая валюта."],
["Tuỳ chọn bản đồ không hợp lệ.","Invalid map option.","地图选项无效。","無効なマップオプションです。","유효하지 않은 지도 옵션입니다.","Недопустимая опция карты."],
["Tuỳ chọn bản đồ dành cho sổ Cá nhân và Gia đình.","Map option is for Personal and Family books.","地图选项仅适用于个人和家庭账本。","マップオプションは個人および家族の帳簿用です。","지도 옵션은 개인 및 가족 가계부 전용입니다.","Опция карты предназначена для личных и семейных книг."],
["Màu giao diện không hợp lệ.","Invalid interface color.","界面颜色无效。","無効なインターフェースカラーです。","유효하지 않은 인터페이스 색상입니다.","Недопустимый цвет интерфейса."],
["Tuỳ chọn màu này dành cho tài khoản cá nhân.","This color option is for personal accounts.","此颜色选项仅适用于个人账户。","このカラーオプションは個人アカウント用です。","이 색상 옵션은 개인 계정 전용입니다.","Эта опция цвета предназначена для личных аккаунтов."],
["Tuỳ chọn phân biệt tiền phải là bật hoặc tắt.","Currency distinction option must be on or off.","货币区分选项必须为开启或关闭。","通貨区別オプションはオンまたはオフにする必要があります。","통화 구분 옵션은 켜짐 또는 꺼짐이어야 합니다.","Опция разделения валют должна быть включена или выключена."],
["Tuỳ chọn này chỉ dành cho tài chính cá nhân.","This option is for personal finance only.","此选项仅适用于个人理财。","このオプションは個人財務専用です。","이 옵션은 개인 재무 전용입니다.","Эта опция предназначена только для личных финансов."],
["Lưu cài đặt thành công","Settings saved successfully","设置保存成功","設定を保存しました","설정이 성공적으로 저장되었습니다","Настройки успешно сохранены"],
["Ngày không hợp lệ.","Invalid date.","日期无效。","無効な日付です。","유효하지 않은 날짜입니다.","Недопустимая дата."],
["Con trỏ trang không hợp lệ.","Invalid page pointer.","无效的页面指针。","無効なページポインタ。","유효하지 않은 페이지 포인터입니다.","Недопустимый указатель страницы."],
["Tháng/năm không hợp lệ.","Invalid month/year.","无效的月份/年份。","無効な月/年。","유효하지 않은 월/년입니다.","Недопустимый месяц/год."],
["Phân trang không hợp lệ.","Invalid pagination.","无效的分页。","無効なページネーション。","유효하지 않은 페이지네이션입니다.","Недопустимая пагинация."],
["Trạng thái không hợp lệ.","Invalid status.","无效的状态。","無効なステータス。","유효하지 않은 상태입니다.","Недопустимый статус."],
["Mã yêu cầu không hợp lệ.","Invalid request code.","无效的请求代码。","無効なリクエストコード。","유효하지 않은 요청 코드입니다.","Недопустимый код запроса."],
["Vui lòng chọn tiền mặt hoặc chuyển khoản.","Please select cash or bank transfer.","请选择现金或银行转账。","現金または銀行振込を選択してください。","현금 또는 계좌 이체를 선택하십시오.","Пожалуйста, выберите наличные или банковский перевод."],
["Hình thức thanh toán không hợp lệ.","Invalid payment method.","无效的付款方式。","無効な支払い方法。","유효하지 않은 결제 수단입니다.","Недопустимый способ оплаты."],
["Vui lòng chọn tiền mặt hoặc tiền tài khoản.","Please select cash or account balance.","请选择现金或账户余额。","現金または口座残高を選択してください。","현금 또는 계좌 잔액을 선택하십시오.","Пожалуйста, выберите наличные или баланс счета."],
["Doanh nghiệp hiện sử dụng VND.","The business currently uses VND.","企业目前使用越南盾 (VND)。","企業は現在VNDを使用しています。","기업은 현재 VND를 사용 중입니다.","Компания в настоящее время использует VND."],
["Mã yêu cầu đã được dùng cho khoản thu chi khác.","Request code has been used for another transaction.","请求代码已被用于其他交易。","リクエストコードは別の取引に使用されています。","요청 코드가 다른 거래에 이미 사용되었습니다.","Код запроса уже использован для другой транзакции."],
["Nhân viên không được xoá khoản thu chi đã gửi.","Staff are not allowed to delete submitted transactions.","员工不允许删除已提交的交易。","スタッフは送信済みの取引を削除できません。","직원은 제출된 거래를 삭제할 수 없습니다.","Сотрудникам не разрешено удалять отправленные транзакции."],
["Mã giao dịch không hợp lệ.","Invalid transaction code.","无效的交易代码。","無効な取引コード。","유효하지 않은 거래 코드입니다.","Недопустимый код транзакции."],
["Không tìm thấy giao dịch hoặc không có quyền xóa.","Transaction not found or no permission to delete.","未找到交易或无权删除。","取引が見つからないか、削除権限がありません。","거래를 찾을 수 없거나 삭제 권한이 없습니다.","Транзакция не найдена или нет прав на удаление."],
["Xóa giao dịch thành công.","Transaction deleted successfully.","交易删除成功。","取引が正常に削除されました。","거래가 성공적으로 삭제되었습니다.","Транзакция успешно удалена."],
["Nhân viên không được sửa khoản thu chi đã gửi.","Staff are not allowed to edit submitted transactions.","员工不允许编辑已提交的交易。","スタッフは送信済みの取引を編集できません。","직원은 제출된 거래를 수정할 수 없습니다.","Сотрудникам не разрешено редактировать отправленные транзакции."],
["Nguồn tiền không hợp lệ.","Invalid funding source.","无效的资金来源。","無効な資金源です。","유효하지 않은 자금 출처입니다.","Неверный источник средств."],
["Không tìm thấy giao dịch.","Transaction not found.","未找到交易。","取引が見つかりません。","거래를 찾을 수 없습니다.","Транзакция не найдена."],
["Vui lòng chọn tiền mặt hoặc tiền tài khoản cho giao dịch này.","Please select cash or account balance for this transaction.","请为此交易选择现金或账户余额。","この取引には現金または口座残高を選択してください。","이 거래에 대해 현금 또는 계좌 잔액을 선택하십시오.","Пожалуйста, выберите наличные или баланс счета для этой транзакции."],
["Chưa có nội dung cập nhật.","No updates yet.","暂无更新内容。","更新はありません。","업데이트된 내용이 없습니다.","Обновлений пока нет."],
["Không tìm thấy giao dịch hoặc không có quyền sửa.","Transaction not found or no permission to edit.","未找到交易或无权编辑。","取引が見つからないか、編集権限がありません。","거래를 찾을 수 없거나 수정 권한이 없습니다.","Транзакция не найдена или нет прав на редактирование."],
["Mã yêu cầu đã được sử dụng.","Request code has already been used.","请求代码已被使用。","リクエストコードは既に使用されています。","요청 코드가 이미 사용되었습니다.","Код запроса уже был использован."],
["Tối đa 100 danh mục.","Maximum 100 categories.","最多100个类别。","最大100カテゴリまでです。","최대 100개의 카테고리까지 가능합니다.","Максимум 100 категорий."],
["Con trỏ không hợp lệ.","Invalid pointer.","无效指针。","無効なポインタです。","유효하지 않은 포인터입니다.","Неверный указатель."],
["Vui lòng nhập đầy đủ thông tin.","Please enter complete information.","请输入完整信息。","情報をすべて入力してください。","모든 정보를 입력하십시오.","Пожалуйста, введите полную информацию."],
["Mật khẩu không đạt yêu cầu bảo mật.","Password does not meet security requirements.","密码不符合安全要求。","パスワードがセキュリティ要件を満たしていません。","비밀번호가 보안 요구 사항을 충족하지 않습니다.","Пароль не соответствует требованиям безопасности."],
["Email đã được sử dụng.","Email already in use.","电子邮件已被使用。","メールアドレスは既に使用されています。","이미 사용 중인 이메일입니다.","Электронная почта уже используется."],
["Đăng ký thành công.","Registration successful.","注册成功。","登録が完了しました。","등록되었습니다.","Регистрация прошла успешно."],
["Lỗi server.","Server error.","服务器错误。","サーバーエラーです。","서버 오류입니다.","Ошибка сервера."],
["Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.","Password must be at least 8 characters, including uppercase, lowercase, numbers, and special characters.","密码至少需要8个字符，包含大写字母、小写字母、数字和特殊字符。","パスワードは8文字以上で、大文字、小文字、数字、特殊文字を含める必要があります。","비밀번호는 대문자, 소문자, 숫자, 특수 문자를 포함하여 최소 8자 이상이어야 합니다.","Пароль должен содержать не менее 8 символов, включая заглавные, строчные буквы, цифры и специальные символы."],
["Nhập tên mục tiêu, tối đa 100 ký tự.","Enter target name, maximum 100 characters.","输入目标名称，最多100个字符。","目標名を入力してください（最大100文字）。","목표 이름을 입력하십시오 (최대 100자).","Введите название цели, максимум 100 символов."],
["Số tiền mục tiêu phải là số nguyên dương, tối đa 1.000 tỷ đồng.","The target amount must be a positive integer, up to 1 trillion VND.","目标金额必须是正整数，最高为1万亿越南盾。","目標金額は正の整数で、最大1兆ドンである必要があります。","목표 금액은 1조 동 이하의 양의 정수여야 합니다.","Целевая сумма должна быть положительным целым числом, максимум 1 триллион донгов."],
["Thời hạn không hợp lệ.","Invalid duration.","期限无效。","期限が無効です。","기간이 유효하지 않습니다.","Неверный срок."],
["Mức góp mỗi tháng không hợp lệ.","Invalid monthly contribution amount.","每月缴款金额无效。","毎月の拠出額が無効です。","월 납입 금액이 유효하지 않습니다.","Неверная сумма ежемесячного взноса."],
["Mức ưu tiên không hợp lệ.","Invalid priority level.","优先级无效。","優先順位が無効です。","우선순위가 유효하지 않습니다.","Неверный уровень приоритета."],
["Lịch nhắc góp không hợp lệ.","Invalid contribution reminder schedule.","缴款提醒时间表无效。","拠出リマインダーのスケジュールが無効です。","납입 알림 일정이 유효하지 않습니다.","Неверный график напоминаний о взносах."],
["Mục tiêu dành cho sổ Cá nhân và Gia đình.","Target is for Personal and Family books.","目标适用于个人和家庭账本。","目標は個人および家族の帳簿用です。","목표는 개인 및 가족 장부용입니다.","Цель предназначена для личных и семейных книг."],
["Vui lòng đăng nhập lại.","Please log in again.","请重新登录。","再度ログインしてください。","다시 로그인해 주세요.","Пожалуйста, войдите снова."],
["Mục tiêu không hợp lệ.","Invalid target.","目标无效。","目標が無効です。","목표가 유효하지 않습니다.","Неверная цель."],
["Không tìm thấy mục tiêu trong sổ đang dùng.","Target not found in the current book.","在当前账本中找不到目标。","現在の帳簿に目標が見つかりません。","현재 장부에서 목표를 찾을 수 없습니다.","Цель не найдена в текущей книге."],
["Số tiền đã dành không hợp lệ.","Invalid reserved amount.","预留金额无效。","確保額が無効です。","예약 금액이 유효하지 않습니다.","Неверная зарезервированная сумма."],
["Yêu cầu tạo mục tiêu không hợp lệ.","Invalid target creation request.","目标创建请求无效。","目標作成リクエストが無効です。","목표 생성 요청이 유효하지 않습니다.","Неверный запрос на создание цели."],
["Chọn thời hạn từ hôm nay trở đi.","Select a duration from today onwards.","请选择从今天开始的期限。","今日以降の期限を選択してください。","오늘부터 시작하는 기간을 선택하세요.","Выберите срок, начиная с сегодняшнего дня."],
["Yêu cầu đã được dùng cho mục tiêu khác.","Request already used for another target.","请求已被用于另一个目标。","リクエストは既に別の目標に使用されています。","요청이 이미 다른 목표에 사용되었습니다.","Запрос уже используется для другой цели."],
["Mục tiêu chưa đủ tiền để hoàn thành.","Target does not have enough money to complete.","目标资金不足以完成。","目標を完了するための資金が不足しています。","목표를 완료하기에 자금이 부족합니다.","Цель не имеет достаточного количества средств для завершения."],
["Số tiền, ghi chú hoặc yêu cầu góp/rút không hợp lệ.","Invalid amount, note, or contribution/withdrawal request.","金额、备注或缴款/取款请求无效。","金額、メモ、または拠出/引き出しリクエストが無効です。","금액, 메모 또는 납입/출금 요청이 유효하지 않습니다.","Неверная сумма, примечание или запрос на внесение/снятие средств."],
["Yêu cầu đã được dùng cho một lần góp/rút khác.","The request has already been used for another contribution/withdrawal.","该请求已被用于另一笔存取款。","このリクエストは別の入出金に既に使用されています。","이 요청은 이미 다른 입금/출금에 사용되었습니다.","Запрос уже был использован для другой операции пополнения/снятия."],
["Tiếp tục mục tiêu trước khi góp tiền.","Continue the goal before contributing money.","在存钱之前请先继续目标。","入金する前に目標を継続してください。","입금하기 전에 목표를 계속 진행하세요.","Продолжите цель перед внесением средств."],
["Trang lịch sử không hợp lệ.","Invalid history page.","无效的历史记录页面。","無効な履歴ページです。","유효하지 않은 기록 페이지입니다.","Недопустимая страница истории."],
["Loại giao dịch không hợp lệ.","Invalid transaction type.","无效的交易类型。","無効な取引タイプです。","유효하지 않은 거래 유형입니다.","Недопустимый тип транзакции."],
["Ngày giao dịch không hợp lệ.","Invalid transaction date.","无效的交易日期。","無効な取引日です。","유효하지 않은 거래 날짜입니다.","Недопустимая дата транзакции."],
["Mô tả tối đa 2000 ký tự.","Description maximum 2000 characters.","描述最多2000个字符。","説明は最大2000文字です。","설명은 최대 2000자까지 가능합니다.","Максимальная длина описания — 2000 символов."],
["Vị trí không hợp lệ.","Invalid location.","无效的位置。","無効な場所です。","유효하지 않은 위치입니다.","Недопустимое местоположение."],
["Danh mục thu chi","Transaction categories","收支分类","収支カテゴリ","수입·지출 분류","Категории операций"],
["Thêm danh mục","Add category","添加分类","カテゴリを追加","분류 추가","Добавить категорию"],
["Sửa danh mục","Edit category","编辑分类","カテゴリを編集","분류 수정","Изменить категорию"],
["Xoá danh mục","Delete category","删除分类","カテゴリを削除","분류 삭제","Удалить категорию"],
["Xoá danh mục?","Delete category?","删除分类？","カテゴリを削除しますか？","분류를 삭제할까요?","Удалить категорию?"],
["Thêm hoặc sửa: 100 xu mỗi lần. Xoá danh mục miễn phí.","Adding or editing costs 100 coins each. Deleting is free.","添加或编辑每次需100金币，删除免费。","追加・編集は1回100コイン。削除は無料です。","추가·수정은 1회당 100코인입니다. 삭제는 무료입니다.","Добавление или изменение стоит 100 монет. Удаление бесплатно."],
["Giao dịch cũ vẫn giữ nguyên danh mục đã ghi.","Existing transactions keep their recorded category.","旧交易保留原分类。","既存の取引のカテゴリは変わりません。","이전 거래에 기록된 분류는 유지됩니다.","Категория ранее записанных операций сохранится."],
["Tên danh mục","Category name","分类名称","カテゴリ名","분류 이름","Название категории"],
["Màu sắc","Color","颜色","色","색상","Цвет"],
["Mã màu","Color code","颜色代码","カラーコード","색상 코드","Код цвета"],
["Lưu danh mục · 100 xu","Save category · 100 coins","保存分类 · 100金币","保存 · 100コイン","분류 저장 · 100코인","Сохранить · 100 монет"],
["Danh mục không hợp lệ.","Invalid category.","分类无效。","カテゴリが無効です。","분류가 유효하지 않습니다.","Недопустимая категория."],
["Danh mục bị trùng.","Category already exists.","分类已存在。","カテゴリは既に存在します。","이미 존재하는 분류입니다.","Категория уже существует."],
["Không đủ xu. Thêm hoặc sửa danh mục cần 100 xu.","Not enough coins. Adding or editing requires 100 coins.","金币不足，添加或编辑需100金币。","コインが足りません。追加・編集は100コインです。","코인이 부족합니다. 추가·수정에는 100코인이 필요합니다.","Недостаточно монет. Требуется 100 монет."],
["Danh mục đã thay đổi. Tải lại danh sách và thử lại.","Category changed. Reload the list and try again.","分类已更改，请刷新后重试。","カテゴリが変更されました。再読み込みしてください。","분류가 변경되었습니다. 새로고침 후 다시 시도하세요.","Категория изменилась. Обновите список и повторите попытку."],
["Không lưu được danh mục.","Could not save category.","无法保存分类。","カテゴリを保存できません。","분류를 저장할 수 없습니다.","Не удалось сохранить категорию."],
["Không lưu được nhận xét.","Could not save review.","无法保存分析。","レビューを保存できません。","분석을 저장할 수 없습니다.","Не удалось сохранить анализ."],
["Nhận xét không hợp lệ hoặc đã hết hạn. Hãy tạo lại nhận xét.","Review is invalid or expired. Generate a new review.","分析无效或已过期，请重新生成。","レビューが無効または期限切れです。再生成してください。","분석이 유효하지 않거나 만료되었습니다. 새로 생성하세요.","Анализ недействителен или истёк. Создайте новый."],
["Số tiền","Amount","金额","金額","금액","Сумма"],
 [
  "Đơn vị tiền tệ",
  "Currency",
  "货币",
  "通貨",
  "통화",
  "Валюта"
 ],
 [
  "Đổi đơn vị tiền tệ?",
  "Change currency?",
  "更换货币？",
  "通貨を変更しますか？",
  "통화를 변경할까요?",
  "Изменить валюту?"
 ],
 [
  "Đơn vị tiền tệ hiện tại",
  "Current currency",
  "当前货币",
  "現在の通貨",
  "현재 통화",
  "Текущая валюта"
 ],
 [
  "Giao dịch cũ giữ nguyên tiền tệ. Giao dịch mới dùng đơn vị tiền tệ đã chọn.",
  "Existing transactions keep their currency. New transactions use the selected currency.",
  "旧交易保留原货币，新交易使用所选货币。",
  "既存の取引の通貨は変わりません。新しい取引は選択した通貨を使用します。",
  "이전 거래의 통화는 유지됩니다. 새 거래에는 선택한 통화가 적용됩니다.",
  "Старые транзакции сохранят прежнюю валюту. Новые транзакции будут использовать выбранную валюту."
 ],
 [
  "Có, đổi tiền tệ",
  "Yes, change currency",
  "是，更换货币",
  "はい、変更する",
  "예, 변경",
  "Да, изменить валюту"
 ],
 [
  "Không, giữ tiền tệ hiện tại",
  "No, keep current currency",
  "否，保留当前货币",
  "いいえ、現在の通貨を維持",
  "아니요, 현재 통화 유지",
  "Нет, оставить текущую валюту"
 ],
 [
  "Tổng thu chi tách theo từng tiền tệ, không quy đổi.",
  "Totals are separate for each currency, without conversion.",
  "按货币分别汇总，不进行兑换。",
  "通貨ごとに集計し、換算しません。",
  "통화별로 합계를 분리하며 환산하지 않습니다.",
  "Итоговые доходы и расходы разделены по валютам, конвертация не производится."
 ],
 [
  "Số tiền không hợp lệ với đơn vị tiền tệ này.",
  "Invalid amount for this currency.",
  "该货币金额无效。",
  "この通貨の金額が無効です。",
  "이 통화에 맞지 않는 금액입니다.",
  "Сумма не соответствует этой валюте."
 ],
 [
  "Lưu nhận xét",
  "Save review",
  "保存分析",
  "レビューを保存",
  "분석 저장",
  "Сохранить комментарий"
 ],
 [
  "Đã lưu nhận xét",
  "Review saved",
  "分析已保存",
  "保存しました",
  "분석 저장됨",
  "Комментарий сохранен"
 ],
 [
  "Nhận xét đã lưu",
  "Saved reviews",
  "已保存的分析",
  "保存したレビュー",
  "저장된 분석",
  "Сохраненные комментарии"
 ],
 [
  "Chưa có nhận xét đã lưu.",
  "No saved reviews yet.",
  "暂无已保存的分析。",
  "保存したレビューはありません。",
  "저장된 분석이 없습니다.",
  "Нет сохраненных комментариев."
 ],
 [
  "Lưu nhận xét trước khi đóng?",
  "Save review before closing?",
  "关闭前保存分析？",
  "閉じる前に保存しますか？",
  "닫기 전에 분석을 저장할까요?",
  "Сохранить комментарий перед закрытием?"
 ],
 [
  "Lưu và đóng",
  "Save and close",
  "保存并关闭",
  "保存して閉じる",
  "저장 후 닫기",
  "Сохранить и закрыть"
 ],
 [
  "Không lưu",
  "Discard",
  "不保存",
  "保存しない",
  "저장 안 함",
  "Не сохранять"
 ],
 [
  "Quay lại",
  "Go back",
  "返回",
  "戻る",
  "돌아가기",
  "Назад"
 ],
 [
  "Đổi ảnh đại diện",
  "Change profile photo",
  "更换头像",
  "プロフィール写真を変更",
  "프로필 사진 변경",
  "Изменить фото профиля"
 ],
 [
  "Đang tải ảnh…",
  "Uploading photo…",
  "正在上传照片…",
  "写真をアップロード中…",
  "사진 업로드 중…",
  "Загрузка фото…"
 ],
 [
  "Chọn ảnh JPG, PNG, WebP hoặc GIF, tối đa 5 MB.",
  "Choose a JPG, PNG, WebP or GIF image up to 5 MB.",
  "请选择不超过5 MB的JPG、PNG、WebP或GIF图片。",
  "5 MB以下のJPG、PNG、WebP、GIF画像を選択してください。",
  "5 MB 이하의 JPG, PNG, WebP 또는 GIF 이미지를 선택하세요.",
  "Выберите фото в формате JPG, PNG, WebP или GIF, до 5 МБ."
 ],
 [
  "Không đọc được ảnh đã chọn.",
  "Could not read the selected photo.",
  "无法读取所选照片。",
  "選択した写真を読み込めません。",
  "선택한 사진을 읽을 수 없습니다.",
  "Не удалось прочитать выбранное фото."
 ],
 [
  "Không cập nhật được ảnh đại diện.",
  "Could not update your profile photo.",
  "无法更新头像。",
  "プロフィール写真を更新できません。",
  "프로필 사진을 변경할 수 없습니다.",
  "Не удалось обновить фото профиля."
 ],
 [
  "AI nhận xét",
  "AI review",
  "AI分析",
  "AIレビュー",
  "AI 분석",
  "AI-комментарий"
 ],
 [
  "Nhận xét thu chi của tháng đang xem",
  "Review income and expenses for this month",
  "分析当前月份的收支",
  "表示中の月の収支を分析",
  "현재 보고 있는 달의 수입과 지출 분석",
  "Комментарий к доходам и расходам за текущий месяц"
 ],
 [
  "Khi bấm nhận xét, tổng thu chi và danh mục của tháng này được gửi tới Google Gemini. Không gửi tên, email, ghi chú hoặc ảnh.",
  "When you request a review, monthly totals and categories are sent to Google Gemini. Names, email, notes and photos are excluded.",
  "请求分析时，本月收支总额和分类将发送至Google Gemini。不发送姓名、邮箱、备注或照片。",
  "レビューを依頼すると月の収支合計とカテゴリがGoogle Geminiに送信されます。名前、メール、メモ、写真は送信しません。",
  "분석을 요청하면 월별 수입·지출 합계와 분류가 Google Gemini로 전송됩니다. 이름, 이메일, 메모, 사진은 전송되지 않습니다.",
  "При нажатии на комментарий общие доходы, расходы и категории за этот месяц отправляются в Google Gemini. Имена, email, заметки или фото не передаются."
 ],
 [
  "Đang nhận xét…",
  "Preparing review…",
  "正在分析…",
  "分析中…",
  "분석 중…",
  "Создание комментария…"
 ],
 [
  "Cập nhật nhận xét",
  "Refresh review",
  "更新分析",
  "レビューを更新",
  "분석 새로고침",
  "Обновить комментарий"
 ],
 [
  "Nhận xét thu chi",
  "Review finances",
  "分析收支",
  "収支を分析",
  "수입과 지출 분석",
  "Комментарий к доходам и расходам"
 ],
 [
  "Nhận xét dựa trên các giao dịch đã ghi, không phải toàn bộ tình hình tài chính của bạn.",
  "This review is based on recorded transactions and does not reflect your complete financial situation.",
  "分析基于已记录交易，不代表您的完整财务状况。",
  "記録された取引に基づく分析で、財務状況全体を表すものではありません。",
  "이 분석은 기록된 거래에 기반하며 전체 재정 상황을 반영하지 않습니다.",
  "Комментарий основан только на записанных транзакциях, а не на вашем общем финансовом состоянии."
 ],
 [
  "Không thể nhận xét lúc này. Vui lòng thử lại.",
  "Unable to review now. Please try again.",
  "暂时无法分析，请重试。",
  "現在分析できません。もう一度お試しください。",
  "지금 분석할 수 없습니다. 다시 시도하세요.",
  "Сейчас невозможно создать комментарий. Пожалуйста, попробуйте позже."
 ],
 [
  "AI đang quá tải. Vui lòng thử lại sau.",
  "AI is busy. Please try again later.",
  "AI繁忙，请稍后重试。",
  "AIが混み合っています。後でお試しください。",
  "AI가 혼잡합니다. 나중에 다시 시도하세요.",
  "AI перегружен. Пожалуйста, попробуйте позже."
 ],
 [
  "AI tạm thời không khả dụng.",
  "AI is temporarily unavailable.",
  "AI暂时不可用。",
  "AIは一時的に利用できません。",
  "AI를 일시적으로 사용할 수 없습니다.",
  "AI временно недоступен."
 ],
 [
  "AI chưa phản hồi. Vui lòng thử lại.",
  "AI did not respond. Please try again.",
  "AI未响应，请重试。",
  "AIから応答がありません。もう一度お試しください。",
  "AI가 응답하지 않았습니다. 다시 시도하세요.",
  "AI не ответил. Пожалуйста, попробуйте позже."
 ],
 [
  "AI chưa tạo được nhận xét. Vui lòng thử lại.",
  "AI could not generate a review. Please try again.",
  "AI无法生成分析，请重试。",
  "レビューを生成できません。もう一度お試しください。",
  "AI 분석을 생성하지 못했습니다. 다시 시도하세요.",
  "AI не смог создать комментарий. Пожалуйста, попробуйте позже."
 ],
 [
  "Thu chi theo thành viên",
  "Income and expenses by member",
  "成员收支",
  "メンバー別収支",
  "구성원별 수입과 지출",
  "Доходы и расходы по участникам"
 ],
 [
  "Tài chính an tâm, tương lai vững bền",
  "Financial peace, a brighter future",
  "财务安心，未来稳健",
  "安心の家計、明るい未来",
  "안심하는 재정, 든든한 미래",
  "Финансовое спокойствие, уверенное будущее"
 ],
 [
  "ĐANG TẢI DỮ LIỆU…",
  "LOADING YOUR DATA…",
  "正在加载数据…",
  "データを読み込み中…",
  "데이터 불러오는 중…",
  "ЗАГРУЗКА ДАННЫХ…"
 ],
 [
  "Đang chuẩn bị không gian tài chính cho bạn…",
  "Preparing your financial space…",
  "正在为您准备财务空间…",
  "あなたの家計スペースを準備しています…",
  "금융 공간을 준비하고 있어요…",
  "Подготавливаем ваше финансовое пространство…"
 ],
 [
  "Điểm danh liên tục",
  "Check-in streak",
  "连续签到",
  "連続チェックイン",
  "연속 출석",
  "Ежедневная отметка"
 ],
 [
  "Nhắc nhở trên điện thoại",
  "Phone reminders",
  "手机提醒",
  "スマートフォンのリマインダー",
  "휴대폰 알림",
  "Напоминания на телефоне"
 ],
 [
  "07:00 — Điểm danh · 21:00 — Ghi khoản chi (theo giờ điện thoại)",
  "07:00 — Check in · 21:00 — Record expenses (device time)",
  "07:00 — 签到 · 21:00 — 记录支出（手机时间）",
  "07:00 — チェックイン · 21:00 — 支出の記録（端末時刻）",
  "07:00 — 출석 · 21:00 — 지출 기록 (기기 시간)",
  "07:00 — Отметка · 21:00 — Запись расходов (по времени телефона)"
 ],
 [
  "Cần mở app trên điện thoại để nhận thông báo.",
  "Use the phone app to receive notifications.",
  "请使用手机应用接收通知。",
  "通知を受け取るにはスマートフォンアプリを使ってください。",
  "알림을 받으려면 휴대폰 앱을 사용하세요.",
  "Чтобы получать уведомления, необходимо открыть приложение на телефоне."
 ],
 [
  "Đã bật nhắc nhở hằng ngày.",
  "Daily reminders are enabled.",
  "每日提醒已开启。",
  "毎日のリマインダーが有効です。",
  "일일 알림이 활성화되었습니다.",
  "Ежедневные напоминания включены."
 ],
 [
  "Cấp quyền thông báo để nhận lời nhắc.",
  "Allow notifications to receive reminders.",
  "允许通知以接收提醒。",
  "リマインダーを受け取るには通知を許可してください。",
  "알림을 허용하여 리마인더를 받으세요.",
  "Разрешите уведомления, чтобы получать напоминания."
 ],
 [
  "Bật thông báo",
  "Enable notifications",
  "开启通知",
  "通知を有効にする",
  "알림 켜기",
  "Включить уведомления"
 ],
 [
  "Điểm danh nhận quà",
  "Daily check-in rewards",
  "签到领奖",
  "チェックイン報酬",
  "출석 보상",
  "Отметьтесь и получите подарок"
 ],
 [
  "Hôm nay",
  "Today",
  "今天",
  "今日",
  "오늘",
  "Сегодня"
 ],
 [
  "Điểm danh ngay",
  "Check in now",
  "立即签到",
  "今すぐチェックイン",
  "지금 출석하기",
  "Отметиться сейчас"
 ],
 [
  "Nhiệm vụ hằng ngày",
  "Daily tasks",
  "每日任务",
  "デイリータスク",
  "일일 과제",
  "Ежедневные задания"
 ],
 [
  "Điểm danh hôm nay",
  "Check in today",
  "今日签到",
  "今日のチェックイン",
  "오늘 출석",
  "Отметка за сегодня"
 ],
 [
  "Điểm danh nhận xu",
  "Check in & earn coins",
  "签到领取金币",
  "チェックインでコイン獲得",
  "출석하고 코인 받기",
  "Отметьтесь и получите монеты"
 ],
 [
  "Đã nhận thưởng",
  "Reward claimed",
  "已领取奖励",
  "報酬を受取済み",
  "보상 수령 완료",
  "Награда получена"
 ],
 [
  "Chuỗi điểm danh",
  "Check-in streak",
  "连续签到",
  "連続チェックイン",
  "연속 출석",
  "Серия отметок"
 ],
 [
  "ngày",
  "days",
  "天",
  "日",
  "일",
  "день"
 ],
 [
  "Ghi nhận thu chi hôm nay",
  "Record today’s transactions",
  "记录今日收支",
  "今日の収支を記録",
  "오늘의 거래 기록",
  "Записать доходы и расходы за сегодня"
 ],
 [
  "Xem giao dịch",
  "View transactions",
  "查看交易",
  "取引を見る",
  "거래 보기",
  "Просмотреть транзакции"
 ],
 [
  "Mốc thưởng điểm danh",
  "Check-in milestones",
  "签到奖励里程碑",
  "チェックイン報酬",
  "출석 보상 단계",
  "Бонус за отметки"
 ],
 [
  "Tiến độ được cập nhật từ sổ thu chi thật. Điểm danh nhận xu một lần mỗi ngày.",
  "Progress uses your real ledger. Check in for coins once a day.",
  "进度来自真实账本。每天签到可领取一次金币。",
  "実際の帳簿で進捗を更新します。コインは1日1回獲得できます。",
  "실제 장부로 진행 상황을 확인합니다. 하루 한 번 출석하여 코인을 받으세요.",
  "Прогресс обновляется на основе реальных записей. Получайте монеты за отметку один раз в день."
 ],
 [
  "Chỉ ghi các khoản thực tế đã phát sinh. Nhiệm vụ này không thưởng xu.",
  "Record only actual transactions. This task has no coin reward.",
  "只记录实际发生的交易。此任务不奖励金币。",
  "実際に発生した取引のみ記録してください。このタスクにコイン報酬はありません。",
  "실제 거래만 기록하세요. 이 과제에는 코인 보상이 없습니다.",
  "Записывайте только фактически совершенные операции. Это задание не приносит монет."
 ],
 [
  "Thưởng mốc thay cho 20 xu của ngày đó. Nghỉ một ngày sẽ bắt đầu lại chuỗi.",
  "Milestone rewards replace that day’s 20 coins. Missing a day resets the streak.",
  "里程碑奖励代替当天的20金币。缺勤一天将重置连续签到。",
  "節目の報酬はその日の20コインに代わります。1日休むと連続記録はリセットされます。",
  "단계 보상은 해당 날짜의 20코인을 대체합니다. 하루 빠지면 연속 기록이 초기화됩니다.",
  "Бонус заменяет 20 монет за этот день. Пропуск одного дня сбрасывает серию."
 ],
 [
  "Đang sử dụng sổ Gia đình",
  "Using the family ledger",
  "正在使用家庭账本",
  "家族帳簿を使用中",
  "가족 장부 사용 중",
  "Используется семейный бюджет"
 ],
 [
  "Đang sử dụng sổ Cá nhân",
  "Using the personal ledger",
  "正在使用个人账本",
  "個人帳簿を使用中",
  "개인 장부 사용 중",
  "Используется личный бюджет"
 ],
 [
  "Lịch chi tiêu",
  "Spending calendar",
  "收支日历",
  "収支カレンダー",
  "지출 달력",
  "Календарь расходов"
 ],
 [
  "T2",
  "Mon",
  "周一",
  "月",
  "월",
  "Пн"
 ],
 [
  "T3",
  "Tue",
  "周二",
  "火",
  "화",
  "Вт"
 ],
 [
  "T4",
  "Wed",
  "周三",
  "水",
  "수",
  "Ср"
 ],
 [
  "T5",
  "Thu",
  "周四",
  "木",
  "목",
  "Чт"
 ],
 [
  "T6",
  "Fri",
  "周五",
  "金",
  "금",
  "Пт"
 ],
 [
  "T7",
  "Sat",
  "周六",
  "土",
  "토",
  "Сб"
 ],
 [
  "CN",
  "Sun",
  "周日",
  "日",
  "일",
  "Вс"
 ],
 [
  "Chưa có giao dịch trong ngày này.",
  "No transactions on this day.",
  "当天没有交易。",
  "この日の取引はありません。",
  "이 날짜에 거래가 없습니다.",
  "В этот день нет транзакций."
 ],
 [
  "Chưa có giao dịch. Thêm khoản thu hoặc chi để bắt đầu.",
  "No transactions yet. Add income or an expense to begin.",
  "暂无交易。添加收入或支出以开始。",
  "収入または支出を追加して始めましょう。",
  "수입 또는 지출을 추가하여 시작하세요.",
  "Транзакций пока нет. Добавьте доход или расход, чтобы начать."
 ],
 [
  "Dữ liệu đồng bộ với Peacee1",
  "Data synced with Peacee1",
  "数据已与Peacee1同步",
  "Peacee1と同期済み",
  "Peacee1과 데이터 동기화",
  "Данные синхронизированы с Peacee1"
 ],
 [
  "Sổ chung Gia đình",
  "Shared family ledger",
  "家庭共享账本",
  "家族共有帳簿",
  "가족 공유 장부",
  "Семейный бюджет"
 ],
 [
  "giao dịch",
  "transactions",
  "笔交易",
  "件の取引",
  "건의 거래",
  "транзакция"
 ],
 [
  "xu",
  "coins",
  "金币",
  "コイン",
  "코인",
  "монет"
 ],
 [
  "Tạo mục tiêu",
  "Create goal",
  "创建目标",
  "目標を作成",
  "목표 만들기",
  "Создать цель"
 ],
 [
  "Tên mục tiêu",
  "Goal name",
  "目标名称",
  "目標名",
  "목표 이름",
  "Название цели"
 ],
 [
  "Số tiền cần (VNĐ)",
  "Target amount (VND)",
  "目标金额（越南盾）",
  "目標金額（VND）",
  "목표 금액 (VND)",
  "Целевая сумма (VND)"
 ],
 [
  "Đã dành riêng (VNĐ)",
  "Initial savings (VND)",
  "已有储蓄（越南盾）",
  "現在の貯蓄（VND）",
  "현재 저축액 (VND)",
  "Накоплено (VND)"
 ],
 [
  "Thời hạn (YYYY-MM-DD, tùy chọn)",
  "Deadline (YYYY-MM-DD, optional)",
  "截止日期（YYYY-MM-DD，可选）",
  "期限（YYYY-MM-DD、任意）",
  "기한 (YYYY-MM-DD, 선택)",
  "Срок (ГГГГ-ММ-ДД, опционально)"
 ],
 [
  "Mức góp mỗi tháng (tùy chọn)",
  "Monthly contribution (optional)",
  "每月储蓄金额（可选）",
  "毎月の積立額（任意）",
  "월 저축액 (선택)",
  "Ежемесячный взнос (опционально)"
 ],
 [
  "Ưu tiên cao",
  "High priority",
  "高优先级",
  "優先度：高",
  "높은 우선순위",
  "Высокий приоритет"
 ],
 [
  "Bình thường",
  "Normal",
  "普通",
  "通常",
  "보통",
  "Обычный"
 ],
 [
  "Ưu tiên thấp",
  "Low priority",
  "低优先级",
  "優先度：低",
  "낮은 우선순위",
  "Низкий приоритет"
 ],
 [
  "Mua xe",
  "Buy a vehicle",
  "购车",
  "車の購入",
  "차량 구매",
  "Покупка авто"
 ],
 [
  "Du lịch",
  "Travel",
  "旅行",
  "旅行",
  "여행",
  "Путешествие"
 ],
 [
  "Quỹ dự phòng",
  "Emergency fund",
  "应急基金",
  "緊急資金",
  "비상 자금",
  "Резервный фонд"
 ],
 [
  "Quay lại",
  "Back",
  "返回",
  "戻る",
  "뒤로",
  "Назад"
 ],
 [
  "Góp tiền",
  "Add savings",
  "存入资金",
  "積み立てる",
  "저축 추가",
  "Внести средства"
 ],
 [
  "Rút tiền",
  "Withdraw savings",
  "取出资金",
  "引き出す",
  "저축 인출",
  "Снять средства"
 ],
 [
  "Lịch sử",
  "History",
  "历史",
  "履歴",
  "내역",
  "История"
 ],
 [
  "Lịch sử mục tiêu",
  "Goal history",
  "目标记录",
  "目標の履歴",
  "목표 내역",
  "История цели"
 ],
 [
  "Hoàn thành",
  "Completed",
  "已完成",
  "完了",
  "완료",
  "Завершено"
 ],
 [
  "Tạm dừng",
  "Paused",
  "已暂停",
  "一時停止",
  "일시 중지",
  "Приостановлено"
 ],
 [
  "Đang thực hiện",
  "In progress",
  "进行中",
  "進行中",
  "진행 중",
  "В процессе"
 ],
 [
  "Số tiền ban đầu",
  "Initial amount",
  "初始金额",
  "初期金額",
  "초기 금액",
  "Начальная сумма"
 ],
 [
  "Chưa có lần góp/rút nào.",
  "No contributions or withdrawals yet.",
  "暂无存取记录。",
  "積立・引き出しの記録はありません。",
  "저축 및 인출 내역이 없습니다.",
  "Взносов или снятий пока нет."
 ],
 [
  "Chưa có mục tiêu. Bắt đầu với điều bạn muốn dành tiền cho.",
  "No goals yet. Start with something you want to save for.",
  "暂无目标。开始为您想要的东西储蓄。",
  "貯蓄したいことから目標を始めましょう。",
  "저축하고 싶은 목표를 만들어보세요.",
  "Целей пока нет. Начните с того, на что хотите накопить."
 ],
 [
  "Mã mời — nhấn giữ để sao chép",
  "Invitation code — long press to copy",
  "邀请码 — 长按复制",
  "招待コード — 長押しでコピー",
  "초대 코드 — 길게 눌러 복사",
  "Код приглашения — удерживайте, чтобы скопировать"
 ],
 [
  "Giải tán Gia đình?",
  "Dissolve family?",
  "解散家庭？",
  "家族を解散しますか？",
  "가족을 해산할까요?",
  "Расформировать семью?"
 ],
 [
  "Rời Gia đình?",
  "Leave family?",
  "退出家庭？",
  "家族を退出しますか？",
  "가족을 떠날까요?",
  "Покинуть семью?"
 ],
 [
  "Bạn đã rời Gia đình",
  "You left the family",
  "您已退出家庭",
  "家族を退出しました",
  "가족을 떠났습니다",
  "Вы покинули семью"
 ],
 [
  "Gia đình đã giải tán",
  "Family dissolved",
  "家庭已解散",
  "家族が解散しました",
  "가족이 해산되었습니다",
  "Семья расформирована"
 ],
 [
  "Mua thêm slot · 1.500 xu?",
  "Add a slot for 1,500 coins?",
  "花费1,500金币添加名额？",
  "1,500コインで枠を追加しますか？",
  "1,500코인으로 자리를 추가할까요?",
  "Купить дополнительное место · 1500 монет?"
 ],
 [
  "Trừ 1.500 xu từ tài khoản của bạn để thêm chỗ cho một thành viên.",
  "Deduct 1,500 coins from your account to add one member slot.",
  "从您的账户扣除1,500金币以添加一个成员名额。",
  "1,500コインを使い、メンバー枠を1つ追加します。",
  "회원 자리 하나를 추가하기 위해 1,500코인을 사용합니다.",
  "Списать 1500 монет с вашего счета, чтобы добавить место для участника."
 ],
 [
  "Dùng chung lịch, thu chi và mục tiêu. Khi ở chế độ Gia đình, bạn sử dụng sổ chung thay cho sổ Cá nhân.",
  "Share a calendar, transactions and goals. Family mode uses the shared ledger.",
  "共享日历、收支和目标。家庭模式使用共享账本。",
  "カレンダー、収支、目標を共有します。家族モードでは共有帳簿を使います。",
  "달력, 거래, 목표를 공유합니다. 가족 모드에서는 공유 장부를 사용합니다.",
  "Общий календарь, доходы/расходы и цели. В семейном режиме вы используете общую книгу вместо личной."
 ],
 [
  "Chọn Có để sao chép thu chi cá nhân vào sổ chung. Dữ liệu cá nhân gốc vẫn được giữ lại.",
  "Choose Yes to copy personal transactions to the shared ledger. Your original personal data is kept.",
  "选择是将个人收支复制到共享账本。原始个人数据将保留。",
  "はいを選ぶと個人の収支を共有帳簿にコピーします。元の個人データは保持されます。",
  "예를 선택하면 개인 거래가 공유 장부에 복사됩니다. 원래 개인 데이터는 유지됩니다.",
  "Выберите «Да», чтобы скопировать личные доходы/расходы в общую книгу. Исходные личные данные будут сохранены."
 ],
 [
  "Tất cả thành viên sẽ trở về Cá nhân và được chọn đồng bộ dữ liệu.",
  "All members return to personal mode and can choose to sync data.",
  "所有成员将返回个人模式，并可选择同步数据。",
  "全員が個人モードに戻り、同期するか選択できます。",
  "모든 회원이 개인 모드로 돌아가 데이터 동기화를 선택할 수 있습니다.",
  "Все участники вернутся в личный режим, и им будет предложено синхронизировать данные."
 ],
 [
  "Bạn trở về Cá nhân và được chọn đồng bộ dữ liệu. Các thành viên khác tiếp tục dùng sổ chung.",
  "You return to personal mode and can choose to sync data. Other members keep using the shared ledger.",
  "您将返回个人模式并可选择同步数据。其他成员继续使用共享账本。",
  "個人モードに戻り、同期するか選択できます。他のメンバーは共有帳簿を使い続けます。",
  "개인 모드로 돌아가 동기화를 선택할 수 있습니다. 다른 회원은 공유 장부를 계속 사용합니다.",
  "Вы вернетесь в личный режим, и вам будет предложено синхронизировать данные. Остальные участники продолжат использовать общую книгу."
 ],
 [
  "Trang chủ",
  "Home",
  "首页",
  "ホーム",
  "홈",
  "Главная"
 ],
 [
  "Phân tích",
  "Analytics",
  "分析",
  "分析",
  "분석",
  "Аналитика"
 ],
 [
  "Lịch",
  "Calendar",
  "日历",
  "カレンダー",
  "달력",
  "Календарь"
 ],
 [
  "Hồ sơ",
  "Profile",
  "个人资料",
  "プロフィール",
  "프로필",
  "Профиль"
 ],
 [
  "Thêm thu chi",
  "Add transaction",
  "添加收支",
  "収支を追加",
  "거래 추가",
  "Добавить запись"
 ],
 [
  "Hồ sơ cá nhân",
  "My profile",
  "个人资料",
  "マイプロフィール",
  "내 프로필",
  "Личный профиль"
 ],
 [
  "CÀI ĐẶT CÁ NHÂN",
  "PERSONAL SETTINGS",
  "个人设置",
  "個人設定",
  "개인 설정",
  "ЛИЧНЫЕ НАСТРОЙКИ"
 ],
 [
  "ỨNG DỤNG",
  "APP",
  "应用",
  "アプリ",
  "앱",
  "ПРИЛОЖЕНИЕ"
 ],
 [
  "Thông tin tài khoản",
  "Account information",
  "账户信息",
  "アカウント情報",
  "계정 정보",
  "Информация об аккаунте"
 ],
 [
  "Thông báo",
  "Notifications",
  "通知",
  "通知",
  "알림",
  "Уведомления"
 ],
 [
  "Gia đình",
  "Family",
  "家庭",
  "家族",
  "가족",
  "Семья"
 ],
 [
  "Cá nhân",
  "Personal",
  "个人",
  "個人",
  "개인",
  "Личное"
 ],
 [
  "Đang tham gia",
  "Joined",
  "已加入",
  "参加中",
  "참여 중",
  "Участвует"
 ],
 [
  "Thiết lập",
  "Set up",
  "设置",
  "設定",
  "설정",
  "Настройки"
 ],
 [
  "Mục tiêu tiết kiệm",
  "Savings goals",
  "储蓄目标",
  "貯蓄目標",
  "저축 목표",
  "Цели накоплений"
 ],
 [
  "Điểm danh hằng ngày",
  "Daily check-in",
  "每日签到",
  "毎日のチェックイン",
  "매일 출석",
  "Ежедневная отметка"
 ],
 [
  "Giao diện",
  "Appearance",
  "外观",
  "外観",
  "화면 설정",
  "Интерфейс"
 ],
 [
  "Ngôn ngữ",
  "Language",
  "语言",
  "言語",
  "언어",
  "Язык"
 ],
 [
  "Đăng xuất",
  "Log out",
  "退出登录",
  "ログアウト",
  "로그아웃",
  "Выйти"
 ],
 [
  "CHẾ ĐỘ",
  "MODE",
  "模式",
  "モード",
  "모드",
  "РЕЖИМ"
 ],
 [
  "ĐIỂM THƯỞNG",
  "REWARDS",
  "奖励",
  "ポイント",
  "포인트",
  "БОНУСНЫЕ БАЛЛЫ"
 ],
 [
  "Sáng",
  "Light",
  "浅色",
  "ライト",
  "라이트",
  "Светлая"
 ],
 [
  "Tối",
  "Dark",
  "深色",
  "ダーク",
  "다크",
  "Темная"
 ],
 [
  "Hệ thống",
  "System",
  "跟随系统",
  "システム",
  "시스템",
  "Системная"
 ],
 [
  "Chế độ hiển thị",
  "Display mode",
  "显示模式",
  "表示モード",
  "화면 모드",
  "Тема оформления"
 ],
 [
  "Màu chủ đạo",
  "Accent color",
  "主题颜色",
  "テーマカラー",
  "테마 색상",
  "Основной цвет"
 ],
 [
  "Tím",
  "Purple",
  "紫色",
  "パープル",
  "보라",
  "Фиолетовый"
 ],
 [
  "Hồng",
  "Pink",
  "粉色",
  "ピンク",
  "분홍",
  "Розовый"
 ],
 [
  "Xanh lá",
  "Green",
  "绿色",
  "グリーン",
  "초록",
  "Зеленый"
 ],
 [
  "Xanh dương",
  "Blue",
  "蓝色",
  "ブルー",
  "파랑",
  "Синий"
 ],
 [
  "Vàng",
  "Yellow",
  "黄色",
  "イエロー",
  "노랑",
  "Желтый"
 ],
 [
  "Đóng",
  "Close",
  "关闭",
  "閉じる",
  "닫기",
  "Закрыть"
 ],
 [
  "Hủy",
  "Cancel",
  "取消",
  "キャンセル",
  "취소",
  "Отмена"
 ],
 [
  "Xác nhận",
  "Confirm",
  "确认",
  "確認",
  "확인",
  "Подтвердить"
 ],
 [
  "Thử lại",
  "Retry",
  "重试",
  "再試行",
  "다시 시도",
  "Повторить"
 ],
 [
  "Đang xử lý…",
  "Processing…",
  "处理中…",
  "処理中…",
  "처리 중…",
  "Обработка…"
 ],
 [
  "Đang lưu…",
  "Saving…",
  "保存中…",
  "保存中…",
  "저장 중…",
  "Сохранение…"
 ],
 [
  "Khoản chi",
  "Expense",
  "支出",
  "支出",
  "지출",
  "Расход"
 ],
 [
  "Khoản thu",
  "Income",
  "收入",
  "収入",
  "수입",
  "Доход"
 ],
 [
  "Thêm khoản thu",
  "Add income",
  "添加收入",
  "収入を追加",
  "수입 추가",
  "Добавить доход"
 ],
 [
  "Thêm khoản chi",
  "Add expense",
  "添加支出",
  "支出を追加",
  "지출 추가",
  "Добавить расход"
 ],
 [
  "Số tiền (VNĐ)",
  "Amount (VND)",
  "金额（越南盾）",
  "金額（VND）",
  "금액 (VND)",
  "Сумма (VND)"
 ],
 [
  "Danh mục",
  "Category",
  "类别",
  "カテゴリー",
  "카테고리",
  "Категория"
 ],
 [
  "Ngày (YYYY-MM-DD)",
  "Date (YYYY-MM-DD)",
  "日期 (YYYY-MM-DD)",
  "日付 (YYYY-MM-DD)",
  "날짜 (YYYY-MM-DD)",
  "Дата (ГГГГ-ММ-ДД)"
 ],
 [
  "Ghi chú",
  "Note",
  "备注",
  "メモ",
  "메모",
  "Заметка"
 ],
 [
  "Nguồn tiền",
  "Payment source",
  "资金来源",
  "支払元",
  "결제 수단",
  "Источник средств"
 ],
 [
  "Tiền mặt",
  "Cash",
  "现金",
  "現金",
  "현금",
  "Наличные"
 ],
 [
  "Tài khoản",
  "Bank account",
  "银行账户",
  "銀行口座",
  "은행 계좌",
  "Счет"
 ],
 [
  "Lưu giao dịch",
  "Save transaction",
  "保存交易",
  "取引を保存",
  "거래 저장",
  "Сохранить транзакцию"
 ],
 [
  "Lưu vào sổ Cá nhân",
  "Save to personal ledger",
  "保存到个人账本",
  "個人帳簿に保存",
  "개인 장부에 저장",
  "Сохранить в личный бюджет"
 ],
 [
  "Lưu vào sổ chung Gia đình",
  "Save to family ledger",
  "保存到家庭账本",
  "家族帳簿に保存",
  "가족 장부에 저장",
  "Сохранить в семейный бюджет"
 ],
 [
  "Sổ Cá nhân",
  "Personal ledger",
  "个人账本",
  "個人帳簿",
  "개인 장부",
  "Личный бюджет"
 ],
 [
  "Sổ Gia đình",
  "Family ledger",
  "家庭账本",
  "家族帳簿",
  "가족 장부",
  "Семейный бюджет"
 ],
 [
  "Chênh lệch thu chi tháng này",
  "This month’s net income",
  "本月收支差额",
  "今月の収支差額",
  "이번 달 수입과 지출 차액",
  "Баланс за этот месяц"
 ],
 [
  "Thu nhập",
  "Income",
  "收入",
  "収入",
  "수입",
  "Доходы"
 ],
 [
  "Chi tiêu",
  "Expenses",
  "支出",
  "支出",
  "지출",
  "Расходы"
 ],
 [
  "Giao dịch gần đây",
  "Recent transactions",
  "最近交易",
  "最近の取引",
  "최근 거래",
  "Последние транзакции"
 ],
 [
  "Xem tất cả →",
  "View all →",
  "查看全部 →",
  "すべて見る →",
  "전체 보기 →",
  "Смотреть все →"
 ],
 [
  "Phân tích thu chi",
  "Income & expense analysis",
  "收支分析",
  "収支分析",
  "수입 및 지출 분석",
  "Анализ доходов и расходов"
 ],
 [
  "Tháng đang chọn",
  "Selected month",
  "所选月份",
  "選択した月",
  "선택한 달",
  "Выбранный месяц"
 ],
 [
  "Cơ cấu chi tiêu",
  "Expense breakdown",
  "支出构成",
  "支出の内訳",
  "지출 구성",
  "Структура расходов"
 ],
 [
  "Tổng chi tiêu",
  "Total expenses",
  "总支出",
  "支出合計",
  "총 지출",
  "Общие расходы"
 ],
 [
  "Chi tiêu theo danh mục",
  "Expenses by category",
  "分类支出",
  "カテゴリー別支出",
  "카테고리별 지출",
  "Расходы по категориям"
 ],
 [
  "Xem tiến độ và cập nhật tiền đã dành",
  "Track progress and update savings",
  "查看进度并更新储蓄",
  "進捗と貯蓄額を確認",
  "진행 상황과 저축액 확인",
  "Просмотр прогресса и обновление трат"
 ],
 [
  "Chào bạn quay lại",
  "Welcome back",
  "欢迎回来",
  "おかえりなさい",
  "다시 오신 것을 환영합니다",
  "С возвращением"
 ],
 [
  "Đăng nhập để quản lý chi tiêu",
  "Sign in to manage your finances",
  "登录以管理收支",
  "ログインして収支を管理",
  "로그인하여 재정 관리",
  "Войдите, чтобы управлять расходами"
 ],
 [
  "Tạo tài khoản",
  "Create account",
  "创建账户",
  "アカウント作成",
  "계정 만들기",
  "Создать аккаунт"
 ],
 [
  "Bắt đầu hành trình tiết kiệm",
  "Start your savings journey",
  "开始储蓄之旅",
  "貯蓄を始めましょう",
  "저축을 시작하세요",
  "Начните свой путь к сбережениям"
 ],
 [
  "Họ và tên",
  "Full name",
  "姓名",
  "氏名",
  "이름",
  "ФИО"
 ],
 [
  "Họ và tên của bạn",
  "Your full name",
  "您的姓名",
  "お名前",
  "이름 입력",
  "Ваше полное имя"
 ],
 [
  "Mật khẩu",
  "Password",
  "密码",
  "パスワード",
  "비밀번호",
  "Пароль"
 ],
 [
  "Nhập lại mật khẩu",
  "Confirm password",
  "确认密码",
  "パスワード確認",
  "비밀번호 확인",
  "Повторите пароль"
 ],
 [
  "Tiếp tục",
  "Continue",
  "继续",
  "続ける",
  "계속",
  "Продолжить"
 ],
 [
  "Đăng ký ngay",
  "Sign up",
  "立即注册",
  "登録する",
  "가입하기",
  "Зарегистрироваться"
 ],
 [
  "Đăng nhập",
  "Sign in",
  "登录",
  "ログイン",
  "로그인",
  "Войти"
 ],
 [
  "Đã có tài khoản?",
  "Already have an account?",
  "已有账户？",
  "アカウントをお持ちですか？",
  "이미 계정이 있나요?",
  "Уже есть аккаунт?"
 ],
 [
  "Bạn là người mới?",
  "New here?",
  "新用户？",
  "初めてですか？",
  "처음이신가요?",
  "Вы здесь впервые?"
 ],
 [
  "Quản lý tiền mỗi ngày, cùng bạn xây dựng những mục tiêu lớn.",
  "Manage money daily and build your goals.",
  "每天管理资金，实现您的目标。",
  "毎日のお金を管理し、目標を実現しましょう。",
  "매일 돈을 관리하고 목표를 이루세요.",
  "Управляйте деньгами каждый день и достигайте больших целей вместе с Peacee1."
 ],
 [
  "Tạo Gia đình",
  "Create family",
  "创建家庭",
  "家族を作成",
  "가족 만들기",
  "Создать семью"
 ],
 [
  "Tham gia Gia đình",
  "Join family",
  "加入家庭",
  "家族に参加",
  "가족 참여",
  "Присоединиться к семье"
 ],
 [
  "Tham gia",
  "Join",
  "加入",
  "参加",
  "참여",
  "Присоединиться"
 ],
 [
  "Tên gia đình",
  "Family name",
  "家庭名称",
  "家族名",
  "가족 이름",
  "Название семьи"
 ],
 [
  "Mã mời từ người thân",
  "Family invitation code",
  "家庭邀请码",
  "家族の招待コード",
  "가족 초대 코드",
  "Код приглашения от близких"
 ],
 [
  "Mặc định có 2 chỗ cho thành viên.",
  "Includes 2 member slots.",
  "默认包含2个成员名额。",
  "メンバー2人分の枠があります。",
  "기본 회원 자리 2개가 제공됩니다.",
  "По умолчанию доступно 2 места для участников."
 ],
 [
  "Giải tán Gia đình",
  "Dissolve family",
  "解散家庭",
  "家族を解散",
  "가족 해산",
  "Расформировать семью"
 ],
 [
  "Rời Gia đình",
  "Leave family",
  "退出家庭",
  "家族を退出",
  "가족 떠나기",
  "Покинуть семью"
 ],
 [
  "Có, đồng bộ",
  "Yes, sync",
  "是，同步",
  "はい、同期する",
  "예, 동기화",
  "Да, синхронизировать"
 ],
 [
  "Không đồng bộ",
  "Do not sync",
  "不同步",
  "同期しない",
  "동기화하지 않기",
  "Не синхронизировать"
 ],
 [
  "Đồng bộ Cá nhân với Gia đình?",
  "Sync personal data to family?",
  "将个人数据同步到家庭？",
  "個人データを家族に同期しますか？",
  "개인 데이터를 가족과 동기화할까요?",
  "Синхронизировать личные данные с семейными?"
 ],
 [
  "Không, dùng sổ chung riêng",
  "No, start a separate family ledger",
  "否，使用独立家庭账本",
  "いいえ、別の家族帳簿を使う",
  "아니요, 별도 가족 장부 사용",
  "Нет, использовать отдельный общий бюджет"
 ],
 [
  "Mua thêm slot · 1.500 xu",
  "Add member slot · 1,500 coins",
  "添加成员名额 · 1,500金币",
  "メンバー枠を追加 · 1,500コイン",
  "회원 자리 추가 · 1,500코인",
  "Купить еще место · 1.500 монет"
 ],
 [
  "Đánh dấu tất cả đã đọc",
  "Mark all as read",
  "全部标为已读",
  "すべて既読にする",
  "모두 읽음 처리",
  "Отметить все как прочитанные"
 ],
 [
  "Chưa có thông báo.",
  "No notifications yet.",
  "暂无通知。",
  "通知はありません。",
  "알림이 없습니다.",
  "Уведомлений пока нет."
 ],
 [
  "Xem thêm",
  "Load more",
  "加载更多",
  "もっと見る",
  "더 보기",
  "Показать еще"
 ]
];
const dictionary = new Map(rows.map(row => [row[0], row.slice(1)]));
export function translate(text: string, language: Language): string {
  if (language === 'vi') return text;
  const index = ['en','zh','ja','ko','ru'].indexOf(language);
  const match = dictionary.get(text.trim())?.[index];
  if (match) return text.replace(text.trim(), match);
  if(/^Gia đình đã có đủ \d+ tài khoản\. Mua thêm slot để mời người mới\.$/.test(text))return translate('Gia đình đã đủ chỗ. Mua thêm slot để mời người mới.',language);
  const month = /^Tháng (\d+), (\d+)$/.exec(text);
  if (month) return monthLabel(Number(month[1]),Number(month[2]),language);
  const amountLabel=/^Số tiền \((VND|USD|CNY|JPY|KRW|RUB)\)$/.exec(text);if(amountLabel)return `${translate('Số tiền',language)} (${amountLabel[1]})`;
  const coins = /^(\d+) xu$/.exec(text);
  if (coins) return `${coins[1]} ${translate('xu',language)}`;
  const status = /^(\d+)% · (Hoàn thành|Tạm dừng|Đang thực hiện)$/.exec(text);
  if (status) return `${status[1]}% · ${translate(status[2],language)}`;
  const members = /^(\d+)\/(\d+) thành viên$/.exec(text);
  if (members) return `${members[1]}/${members[2]} ${['members','成员','メンバー','회원','участников'][index]}`;
  return text;
}
export function useTranslate() { const language = useContext(LanguageContext); return (text: string) => translate(text, language); }
export function useCategoryLabel() { const language = useContext(LanguageContext); return (name: string) => categoryLabel(name, language); }
export function Text({ children, translateContent = true, ...props }: TextProps & { translateContent?: boolean }) {
  const t = useTranslate();
  const content = (value: React.ReactNode): React.ReactNode => typeof value === 'string' ? t(value) : Array.isArray(value) ? value.map(content) : value;
  return <NativeText {...props}>{translateContent ? content(children) : children}</NativeText>;
}

