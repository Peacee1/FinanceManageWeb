const russianCategories:Record<string,string>={ 'Ăn uống':'Еда и напитки','Mua sắm':'Покупки','Shopping':'Покупки','Di chuyển':'Транспорт','Hoá đơn':'Счета','Hóa đơn':'Счета','Giải trí':'Развлечения','Lương':'Зарплата','Đầu tư':'Инвестиции','Khác':'Другое'};
type Language = 'vi' | 'en' | 'zh' | 'ja' | 'ko' | 'ru';
const categories: Record<string, string[]> = {
  'Ăn uống': ['Food & drinks','餐饮','飲食','식비'],
  'Mua sắm': ['Shopping','购物','買い物','쇼핑'],
  'Shopping': ['Shopping','购物','買い物','쇼핑'],
  'Di chuyển': ['Transport','交通','交通','교통'],
  'Hoá đơn': ['Bills','账单','請求書','공과금'],
  'Hóa đơn': ['Bills','账单','請求書','공과금'],
  'Giải trí': ['Entertainment','娱乐','娯楽','여가'],
  'Lương': ['Salary','工资','給与','급여'],
  'Đầu tư': ['Investment','投资','投資','투자'],
  'Khác': ['Other','其他','その他','기타'],
};
export function categoryLabel(name: string, language: Language) {
  if (language === 'vi') return name;
  if(language==='ru')return russianCategories[name]||name;
  return categories[name]?.[['en','zh','ja','ko','ru'].indexOf(language)] || name;
}
export function monthLabel(month: number, year: number, language: Language) {
  if (language === 'vi') return `Tháng ${month}, ${year}`;
  if (language === 'ru') return new Intl.DateTimeFormat('ru',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));
  if (language === 'en') return new Intl.DateTimeFormat('en', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));
  if (language === 'ko') return `${year}년 ${month}월`;
  return `${year}年${month}月`;
}
