const db=require('../config/db'),delivery=require('../services/accountDelivery'),bcrypt=require('bcrypt');
const {randomInt,randomUUID,randomBytes,createHmac,timingSafeEqual}=require('crypto');
const {isPassword}=require('../utils/validation');
const {clearSession}=require('../utils/webSession');
const invalid='Mã không đúng, đã hết hạn hoặc đã sử dụng.';
function email(value){if(typeof value!=='string'||value.length>255||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))throw Object.assign(Error('Nhập email hợp lệ.'),{status:400});return value.trim().toLowerCase();}
function phone(value){if(typeof value!=='string')return null;let p=value.trim().replace(/[ ()-]/g,'');if(/^0[35789]\d{8}$/.test(p))p='+84'+p.slice(1);return /^\+[1-9]\d{7,14}$/.test(p)?p:null;}
function digest(id,code){return createHmac('sha256',process.env.AUTH_OTP_SECRET||process.env.JWT_SECRET).update(id+':'+code).digest('hex');}
function matches(row,code){return typeof code==='string'&&(/^\d{6}$/.test(code)||(row.purpose==='reset'&&/^[a-f0-9]{64}$/.test(code)))&&timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(digest(row.id,code),'hex'));}
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({message:e.message});if(e.code==='23505')return res.status(409).json({message:'Số điện thoại đã được xác thực cho tài khoản khác.'});next(e);}};
async function findUser(req,purpose,c=db){
 if(req.user){const row=(await c.query('SELECT * FROM users WHERE id=$1',[req.user.userId])).rows[0];return row?.is_active!==false?row:null;}
 const rows=(await c.query("SELECT * FROM users WHERE lower(email)=$1 AND role!='employee'",[email(req.body.email)])).rows;return rows.length===1&&rows[0].is_active!==false?rows[0]:null;
}
async function issue(user,purpose){
 const target=purpose==='phone'?phone(user.phone):user.email;if(!target)throw Object.assign(Error('Thêm số điện thoại hợp lệ trước.'),{status:400});
 const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
 await db.transaction(async c=>{
  await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
  const limit=(await c.query("SELECT count(*) FILTER(WHERE created_at>now()-interval '5 minutes') AS recent,count(*) FILTER(WHERE created_at>now()-interval '1 hour') AS hourly,count(*) AS daily FROM account_challenges WHERE user_id=$1 AND purpose=$2 AND created_at>now()-interval '1 day'",[user.id,purpose])).rows[0];
  if(Number(limit.recent)||Number(limit.hourly)>=3||Number(limit.daily)>=10)throw Object.assign(Error('Vui lòng chờ ít nhất 5 phút trước khi yêu cầu mã mới.'),{status:429});
  await c.query('INSERT INTO account_challenges(id,user_id,purpose,target,code_hash) VALUES($1,$2,$3,$4,$5)',[id,user.id,purpose,target,digest(id,code)]);
 });
 await delivery.send(purpose,target,code);
 await db.query('UPDATE account_challenges SET delivered=true WHERE id=$1',[id]);
}
async function consume(user,purpose,code,apply){
 return db.transaction(async c=>{
  const current=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
  if(!current||current.is_active===false||(purpose==='reset'&&!current.email_verified_at))return false;
  const row=(await c.query("SELECT *,expires_at>now() AS valid FROM account_challenges WHERE user_id=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[user.id,purpose])).rows[0];
  if(!row||!row.valid||!row.delivered||row.consumed_at||row.attempts>=5||row.target!==(purpose==='phone'?phone(current.phone):current.email))return false;
  await c.query('UPDATE account_challenges SET attempts=attempts+1 WHERE id=$1',[row.id]);
  if(!matches(row,code))return false;
  await apply(c,current);
  await c.query('UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL',[user.id,purpose]);
  return true;
 });
}
const requestCode=purpose=>wrap(async(req,res)=>{
 const available=delivery.readiness();if(!(purpose==='phone'?available.sms:available.email))return res.status(503).json({message:'Dịch vụ gửi mã chưa được cấu hình. Vui lòng thử lại sau.'});
 const user=await findUser(req,purpose);
 if(purpose==='reset'&&user&&!user.email_verified_at)return res.status(403).json({code:'EMAIL_VERIFICATION_REQUIRED',message:'Bạn cần xác thực email trước khi yêu cầu đặt lại mật khẩu.'});
 if(user&&(purpose==='phone'||user.role!=='employee')&&(purpose!=='email'||!user.email_verified_at))await issue(user,purpose);
 res.json({message:purpose==='phone'?'Đã gửi mã tới số điện thoại của bạn.':'Nếu email phù hợp với tài khoản, mã sẽ được gửi. Kiểm tra cả thư rác.',expiresIn:600,retryAfter:300});
});
const verifyEmail=wrap(async(req,res)=>{
 const user=await findUser(req,'email');let resetToken;
 const ok=user&&await consume(user,'email',req.body.code,async c=>{
  await c.query('UPDATE users SET email_verified=true,email_verified_at=now() WHERE id=$1',[user.id]);
  if(req.body.resetAfterVerification===true){
   resetToken=randomBytes(32).toString('hex');const id=randomUUID();
   await c.query("UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose='reset' AND consumed_at IS NULL",[user.id]);
   await c.query("INSERT INTO account_challenges(id,user_id,purpose,target,code_hash,delivered) VALUES($1,$2,'reset',$3,$4,true)",[id,user.id,user.email,digest(id,resetToken)]);
  }
 });
 if(!ok)return res.status(400).json({message:invalid});
 res.setHeader('Cache-Control','no-store');
 res.json({message:resetToken?'Đã xác thực email. Hãy đặt mật khẩu mới.':'Đã xác thực email. Bạn có thể đăng nhập.',...(resetToken?{resetToken}: {})});
});
const resetPassword=wrap(async(req,res)=>{if(!isPassword(req.body.newPassword))return res.status(400).json({message:'Mật khẩu cần ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.'});const user=await findUser(req,'reset');const hash=await bcrypt.hash(req.body.newPassword,10);const ok=user&&await consume(user,'reset',req.body.code,c=>c.query('UPDATE users SET password_hash=$1,session_version=session_version+1,must_change_password=false WHERE id=$2',[hash,user.id]));if(!ok)return res.status(400).json({message:invalid});clearSession(res);res.json({message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'});});
const profile=wrap(async(req,res)=>{const user=await findUser(req);res.json({user:{id:user.id,name:user.name,email:user.email,emailVerified:!!user.email_verified_at,phone:user.phone,phoneVerified:!!user.phone_verified_at,role:user.role},delivery:delivery.readiness()});});
const updatePhone=wrap(async(req,res)=>{const p=phone(req.body.phone);if(!p)return res.status(400).json({message:'Nhập số điện thoại hợp lệ; số quốc tế cần mã quốc gia, ví dụ +84.'});await db.transaction(async c=>{const user=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.user.userId])).rows[0];if(user.phone===p)return;await c.query('UPDATE users SET phone=$1,phone_verified=false,phone_verified_at=NULL WHERE id=$2',[p,user.id]);await c.query("UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose='phone' AND consumed_at IS NULL",[user.id]);});res.json({message:'Đã lưu số điện thoại. Hãy xác thực để hoàn tất.'});});
const verifyPhone=wrap(async(req,res)=>{const user=await findUser(req);const ok=user&&await consume(user,'phone',req.body.code,c=>c.query('UPDATE users SET phone_verified=true,phone_verified_at=now() WHERE id=$1',[user.id]));if(!ok)return res.status(400).json({message:invalid});res.json({message:'Đã xác thực số điện thoại.'});});
module.exports={profile,updatePhone,verifyEmail,verifyPhone,resetPassword,requestCode,phone,email,digest,matches,consume,issue};
