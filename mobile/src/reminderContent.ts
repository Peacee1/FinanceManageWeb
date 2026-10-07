type Language='vi'|'en'|'zh'|'ja'|'ko'|'ru';
const messages:Record<Language,{checkin:string;expense:string}>={
 ru:{checkin:'Доброе утро! Отметьтесь, чтобы получить монеты сегодня.',expense:'Запишите сегодняшние расходы! Уделите минуту обновлению учёта.'},
 vi:{checkin:'Chào buổi sáng! Điểm danh để nhận xu hôm nay nhé.',expense:'Ghi lại khoản chi hôm nay nào! Dành một phút cập nhật sổ thu chi nhé.'},
 en:{checkin:'Good morning! Check in to collect your coins today.',expense:'Let’s record today’s expenses! Take a minute to update your ledger.'},
 zh:{checkin:'早上好！签到领取今天的金币吧。',expense:'记录今天的支出吧！花一分钟更新您的账本。'},
 ja:{checkin:'おはようございます！チェックインして今日のコインを受け取りましょう。',expense:'今日の支出を記録しましょう！1分で帳簿を更新。'},
 ko:{checkin:'좋은 아침이에요! 출석하고 오늘의 코인을 받으세요.',expense:'오늘의 지출을 기록해볼까요? 잠시 장부를 업데이트하세요.'},
};
export function reminderContent(language:Language){return [{id:'peacee1-checkin',hour:7,target:'checkin' as const,body:messages[language].checkin},{id:'peacee1-expense',hour:21,target:'expense' as const,body:messages[language].expense}];}
