export function bankExpenseDraft(text:string){
 const input=text.slice(0,12000);
 // Only consider explicit debit/payment amounts, never account numbers or available balances.
 const values=[...input.matchAll(/(?:GD[:\s]*-?|giao dịch[:\s]*-?|trừ|chi tiêu|thanh toán|debit(?:ed)?|paid|payment|chuyển(?: khoản)?(?: đi)?|transfer(?:red)?|số tiền[:\s]*-?|amount[:\s]*-?)\s*[:=-]?\s*([0-9][0-9., ]*)\s*(VND|VNĐ|₫|đ|dong)(?=$|[\s.,;])/giu)].map(match=>{const raw=match[1].trim().replace(/ /g,'');const decimal=/[.,](\d{1,2})$/.exec(raw);if(decimal&&!/^0+$/.test(decimal[1]))return '';return (decimal?raw.slice(0,-decimal[0].length):raw).replace(/[.,]/g,'');});
 const unique=[...new Set(values)].filter(value=>Number.isSafeInteger(Number(value))&&Number(value)>0&&Number(value)<=1e12);
 return {amount:unique.length===1?unique[0]:'',text:input};
}
