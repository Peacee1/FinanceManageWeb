export function bankTransferMemo(appId:string,memo:string){
 // MB's signed QRPay endpoint rejects punctuation and notes longer than 50 characters.
 if(appId!=='mb')return memo;
 return memo.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().slice(0,50).trim();
}
export function directBankLink(body:string){
 if(body.trim().startsWith('{')){
  const result=JSON.parse(body) as {message?:string};
  if(result.message?.includes('invalid transaction note'))throw Error('Nội dung chuyển khoản không hợp lệ với ngân hàng này.');
  throw Error('Không lấy được liên kết ngân hàng.');
 }
 const link=body.match(/(?:const|let|var)\s+DEEPLINK\s*=\s*(['"])(.*?)\1/i)?.[2];
 if(!link||!/^([a-z][a-z0-9+.-]*):\/\//i.test(link)||/^(https?|javascript|data|file|intent):/i.test(link))throw Error('Không đọc được liên kết mở ngân hàng. Vui lòng thử lại.');
 return link;
}
