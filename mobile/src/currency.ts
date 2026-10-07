export const currencies=['VND','USD','CNY','JPY','KRW','RUB'] as const;
export type Currency=typeof currencies[number];
export const languageCurrency:Record<string,Currency>={vi:'VND',en:'USD',zh:'CNY',ja:'JPY',ko:'KRW',ru:'RUB'};
export const currencyItems=currencies.map(value=>({value,label:value}));
export function currencyAmountError(value:string,currency:string){const decimal=['USD','CNY','RUB'].includes(currency);if(!(decimal?/^\d+(?:\.\d{1,2})?$/:/^\d+$/).test(value)||Number(value)<=0||!Number.isSafeInteger(Math.round(Number(value)*(decimal?100:1)))||Number(value)*(decimal?100:1)>1e12)return 'Số tiền không hợp lệ với đơn vị tiền tệ này.';return null;}
