import type {Language} from './i18n';
import {categoryLabel} from './localizedLabels.ts';
const messages:Record<string,string[]>={
 'Đã thêm khoản chi':['Expense added','已添加支出','支出を追加しました','지출이 추가되었습니다','Расход добавлен'],
 'Đã thêm khoản thu':['Income added','已添加收入','収入を追加しました','수입이 추가되었습니다','Доход добавлен'],
 'Đến giờ điểm danh!':['Time to check in!','该签到了！','チェックインの時間です！','출석 체크 시간입니다!','Пора отметиться!'],
 'Điểm danh hôm nay để nhận xu và duy trì chuỗi ngày của bạn.':['Check in today to earn coins and keep your streak going.','今天签到赚取金币，保持连续签到。','今日もチェックインしてコインを獲得し、連続記録を続けましょう。','오늘 출석 체크로 코인을 받고 연속 기록을 이어가세요.','Отметьтесь сегодня, чтобы получить монеты и продолжить серию.'],
 'Cùng người thân quản lý thu chi':['Manage money with your family','与家人一起管理收支','家族と一緒に収支を管理','가족과 함께 수입·지출 관리','Управляйте финансами вместе с семьёй'],
 'Khám phá Gia đình: dùng chung lịch, thu chi và mục tiêu với người thân.':['Explore Family: share a calendar, income, expenses and goals with your loved ones.','探索家庭功能：与家人共享日历、收支和目标。','家族機能でカレンダー、収支、目標を共有しましょう。','가족 기능으로 일정, 수입, 지출, 목표를 공유하세요.','Попробуйте семейный режим: общий календарь, доходы, расходы и цели.'],
 'Đến lịch góp cho mục tiêu':['Time to contribute to your goal','该为目标存钱了','目標への積立日です','목표 저축일입니다','Пора пополнить накопления'],
 'Đã tạo Gia đình':['Family created','已创建家庭','家族を作成しました','가족이 생성되었습니다','Семья создана'],
 'Đã tham gia Gia đình':['Joined a family','已加入家庭','家族に参加しました','가족에 가입했습니다','Вы присоединились к семье'],
 'Gia đình có thành viên mới':['New family member','家庭有新成员','家族に新しいメンバー','새 가족 구성원','Новый участник семьи'],
 'Gia đình đã bị giải tán':['Family dissolved','家庭已解散','家族が解散されました','가족이 해산되었습니다','Семья распущена'],
 'selfRecorded':['You recorded {amount} · {category}{pending}.','您记录了 {amount} · {category}{pending}。','{amount} · {category}{pending}を記録しました。','{amount} · {category}{pending}을 기록했습니다.','Вы записали {amount} · {category}{pending}.'],
 'actorRecorded':['{actor} recorded {amount} · {category}{pending}.','{actor} 记录了 {amount} · {category}{pending}。','{actor}が{amount} · {category}{pending}を記録しました。','{actor}님이 {amount} · {category}{pending}을 기록했습니다.','{actor} записал(а) {amount} · {category}{pending}.'],
 'pending':[' (pending approval)','（待审批）','（承認待ち）',' (승인 대기)',' (ожидает одобрения)'],
 'goal':['Today is your contribution day for “{name}”. Open the goal to update your savings.','今天是“{name}”的存款日。打开目标更新已存金额。','今日は「{name}」の積立日です。目標を開いて貯蓄額を更新しましょう。','오늘은 “{name}”의 저축일입니다. 목표를 열어 저축액을 업데이트하세요.','Сегодня день взноса для цели «{name}». Откройте цель, чтобы обновить сумму накоплений.'],
 'selfJoined':['You joined the family “{name}”.','您加入了家庭“{name}”。','家族「{name}」に参加しました。','“{name}” 가족에 가입했습니다.','Вы присоединились к семье «{name}».'],
 'actorJoined':['{actor} joined the family “{name}”.','{actor} 加入了家庭“{name}”。','{actor}が家族「{name}」に参加しました。','{actor}님이 “{name}” 가족에 가입했습니다.','{actor} присоединился(-ась) к семье «{name}».'],
 'dissolved':['{actor} dissolved the family “{name}”. You can sync the data to your personal calendar.','{actor} 解散了家庭“{name}”。您可以将数据同步到个人日历。','{actor}が家族「{name}」を解散しました。個人カレンダーにデータを同期できます。','{actor}님이 “{name}” 가족을 해산했습니다. 개인 캘린더에 데이터를 동기화할 수 있습니다.','{actor} распустил(а) семью «{name}». Вы можете перенести данные в личный календарь.'],
};
export function notificationText(notice:{title:string;message:string},language:Language){
 if(language==='vi')return {title:notice.title,message:notice.message};
 const index=['en','zh','ja','ko','ru'].indexOf(language);
 const render=(key:string,params:Record<string,string>={})=>(messages[key]?.[index]||key).replace(/\{(\w+)\}/g,(match,name)=>params[name]??match);
 const title=render(notice.title);let message=render(notice.message);
 if(['Đã thêm khoản chi','Đã thêm khoản thu'].includes(notice.title)){
  const match=/^(.*?) đã ghi ([0-9][0-9.,]* (?:₫|VND|USD|CNY|JPY|KRW|RUB)) · (.*?)( \(chờ duyệt\))?\.$/s.exec(notice.message);
  if(match)message=render(match[1]==='Bạn'?'selfRecorded':'actorRecorded',{actor:match[1],amount:match[2],category:categoryLabel(match[3],language),pending:match[4]?render('pending'):''});
 }
 if(notice.title==='Đến lịch góp cho mục tiêu'){
  const match=/^Hôm nay là lịch góp cho “(.*)”. Mở mục tiêu để cập nhật số tiền đã dành\.$/s.exec(notice.message);if(match)message=render('goal',{name:match[1]});
 }
 if(['Đã tạo Gia đình','Đã tham gia Gia đình','Gia đình có thành viên mới'].includes(notice.title)){
  const match=/^(Bạn đã|.*? vừa) tham gia Gia đình “(.*)”\.$/s.exec(notice.message);if(match)message=render(match[1]==='Bạn đã'?'selfJoined':'actorJoined',{actor:match[1].replace(/ vừa$/,''),name:match[2]});
 }
 if(notice.title==='Gia đình đã bị giải tán'){
  const match=/^(.*?) đã giải tán Gia đình “(.*)”. Bạn có thể chọn đồng bộ dữ liệu về lịch Cá nhân\.$/s.exec(notice.message);if(match)message=render('dissolved',{actor:match[1],name:match[2]});
 }
 return {title,message};
}
