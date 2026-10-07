const moneyFormatters=new Map<string,Intl.NumberFormat>();
export const money=(value:string|number,currency='VND')=>{let formatter=moneyFormatters.get(currency);if(!formatter){formatter=new Intl.NumberFormat('vi-VN',{style:'currency',currency,maximumFractionDigits:['USD','CNY','RUB'].includes(currency)?2:0});if(moneyFormatters.size>=32)moneyFormatters.clear();moneyFormatters.set(currency,formatter);}return formatter.format(Number(value)||0);};
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
export const today=()=>dayFormatter.format(new Date());
export const dateLabel=(value:string)=>{const [y,m,d]=value.slice(0,10).split('-');return `${d}/${m}/${y}`;};
export const amountError=(value:string,allowZero=false)=>!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<(allowZero?0:1)||Number(value)>1e12?'Nhập số tiền nguyên hợp lệ, tối đa 1.000 tỷ đồng.':null;
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function currencyTotals(summary:import('./types').Summary|null|undefined,field:'income'|'expense'|'balance',period:'month'|'today'='month',defaultCurrency='VND'){const rows=summary?.by_currency?.length?summary.by_currency:[{currency:defaultCurrency,...(summary||{})}];return rows.map(row=>{const values=row as Record<string,string>;return money(field==='balance'?Number(values[period+'_income']||0)-Number(values[period+'_expense']||0):values[period+'_'+field]||0,row.currency);}).join('\n');}
