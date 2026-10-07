function readiness(){return {email:process.env.AUTH_EMAIL_ENABLED!=='false'&&!!((process.env.BREVO_API_KEY&&process.env.AUTH_EMAIL_ADDRESS)||(process.env.RESEND_API_KEY&&process.env.AUTH_EMAIL_FROM)),sms:!!(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_SMS_FROM)};}
async function send(purpose,target,code){
 const available=readiness();
 if(!(purpose==='phone'?available.sms:available.email))throw Object.assign(Error('Dịch vụ gửi mã chưa được cấu hình.'),{status:503});
 const content=purpose==='reset'?'đặt lại mật khẩu':purpose==='phone'?'xác thực số điện thoại':'xác thực email';
 let response;
 if(purpose==='phone'){
  const sid=process.env.TWILIO_ACCOUNT_SID;
  response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Basic '+Buffer.from(sid+':'+process.env.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({From:process.env.TWILIO_SMS_FROM,To:target,Body:`Peacee1: ma xac thuc so dien thoai la ${code}. Het han sau 10 phut. Khong chia se ma nay.`})});
 }else {
  const subject=`Peacee1 — Mã ${content}`,text=`Mã ${content} của bạn: ${code}\nMã hết hạn sau 10 phút. Không chia sẻ mã với bất kỳ ai. Nếu không yêu cầu, bạn có thể bỏ qua email này.`;
  response=process.env.BREVO_API_KEY?await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'api-key':process.env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Peacee1',email:process.env.AUTH_EMAIL_ADDRESS},to:[{email:target}],subject,textContent:text})}):await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.AUTH_EMAIL_FROM,to:[target],subject,text})});
 }
 if(!response.ok)throw Object.assign(Error('Chưa gửi được mã. Vui lòng thử lại sau.'),{status:503});
}
module.exports={readiness,send};
