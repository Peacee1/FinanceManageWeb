const currencies=['VND','USD','CNY','JPY','KRW','RUB'];
const scale=code=>['USD','CNY','RUB'].includes(code)?100:1;
function minorAmount(value,code){if(!currencies.includes(code))return null;const text=String(value),pattern=scale(code)===100?/^\d+(?:\.\d{1,2})?$/:/^\d+$/;if(!pattern.test(text))return null;const amount=Math.round(Number(text)*scale(code));return Number.isSafeInteger(amount)&&amount>0&&amount<=1e12?amount:null;}
module.exports={currencies,scale,minorAmount};
