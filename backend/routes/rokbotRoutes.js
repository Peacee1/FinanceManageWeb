const express=require('express');
const db=require('../config/db');
const {protect}=require('../middleware/authMiddleware');
const {DEFAULT_CONFIG,validateConfig}=require('../utils/rokConfig');
const {active,getLicense,requireSlots}=require('../utils/rokLicense');
const router=express.Router();router.use(protect);
router.get('/permissions',(req,res)=>res.json({isAdmin:isAdmin(req.user.userId)}));
router.get('/profiles',async(req,res,next)=>{try{res.json((await db.query('SELECT id,name,config,revision,updated_at FROM rokbot_profiles WHERE user_id=$1 ORDER BY id',[req.user.userId])).rows);}catch(e){next(e);}});
router.post('/profiles',async(req,res,next)=>{
 const name=req.body?.name;if(typeof name!=='string'||!name.trim()||name.trim().length>80)return res.status(400).json({message:'Tên cấu hình cần từ 1 đến 80 ký tự.'});
 try{res.status(201).json((await db.query('INSERT INTO rokbot_profiles(user_id,name,config) VALUES($1,$2,$3) RETURNING id,name,config,revision,updated_at',[req.user.userId,name.trim(),JSON.stringify(DEFAULT_CONFIG)])).rows[0]);}catch(e){next(e);}
});
router.put('/profiles/:id',async(req,res,next)=>{
 const {name,config,revision}=req.body||{};
 if(!/^[1-9]\d{0,18}$/.test(req.params.id)||typeof name!=='string'||!name.trim()||name.trim().length>80||!validateConfig(config)||!Number.isSafeInteger(revision)||revision<1)return res.status(400).json({message:'Cấu hình không hợp lệ. Tổng số đội từ 1 đến 7.'});
 try{const rows=(await db.query('UPDATE rokbot_profiles SET name=$1,config=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND user_id=$4 AND revision=$5 RETURNING id,name,config,revision,updated_at',[name.trim(),JSON.stringify(config),req.params.id,req.user.userId,revision])).rows;if(!rows.length)return res.status(409).json({message:'Cấu hình đã thay đổi hoặc không thuộc tài khoản của bạn. Tải lại để kiểm tra.'});res.json(rows[0]);}catch(e){next(e);}
});

const crypto=require('crypto');
const {planFleet,encrypt,decrypt,hash,LIMIT}=require('../utils/rokFleet');
router.get('/overview',async(req,res,next)=>{try{
 const accounts=(await db.query('SELECT id,email,method,governors,config,status,updated_at FROM rokbot_accounts WHERE user_id=$1 ORDER BY id',[req.user.userId])).rows;
 const bots=(await db.query("SELECT DISTINCT b.id,b.last_seen>now()-interval '90 seconds' AS online FROM rokbot_agents b JOIN rokbot_assignments a ON a.agent_id=b.id JOIN rokbot_accounts c ON c.id=a.account_id WHERE c.user_id=$1 AND a.expires_at>now()",[req.user.userId])).rows;
 const assignments=(await db.query('SELECT a.account_id,a.agent_id,a.expires_at FROM rokbot_assignments a JOIN rokbot_accounts c ON c.id=a.account_id WHERE c.user_id=$1 AND a.expires_at>now()',[req.user.userId])).rows;
 const logs=(await db.query('SELECT e.id,e.account_id,a.email AS account_email,e.message,e.created_at FROM rokbot_events e LEFT JOIN rokbot_accounts a ON a.id=e.account_id AND a.user_id=e.user_id WHERE e.user_id=$1 ORDER BY e.id DESC LIMIT 200',[req.user.userId])).rows;
 const license=await getLicense(req.user.userId);res.json({isAdmin:isAdmin(req.user.userId),license,accounts,bots,assignments,logs,preview:planFleet(accounts,bots.filter(b=>b.online))});
}catch(e){next(e);}});
router.get('/logs',async(req,res,next)=>{
 const accountId=req.query.accountId;
 if(accountId!==undefined&&!/^[1-9]\d{0,18}$/.test(accountId))return res.status(400).json({message:'Tài khoản không hợp lệ.'});
 try{const rows=(await db.query('SELECT e.id,e.account_id,a.email AS account_email,e.message,e.created_at FROM rokbot_events e LEFT JOIN rokbot_accounts a ON a.id=e.account_id AND a.user_id=e.user_id WHERE e.user_id=$1 AND ($2::bigint IS NULL OR e.account_id=$2::bigint) ORDER BY e.id DESC LIMIT 200',[req.user.userId,accountId||null])).rows;res.json(rows);}catch(e){next(e);}
});
router.post('/accounts',async(req,res,next)=>{
 const {email,method,password}=req.body||{};
 if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||method!=='password'||method==='password'&&(typeof password!=='string'||password.length<1||password.length>256))return res.status(400).json({message:'Email hoặc phương thức đăng nhập không hợp lệ.'});
 try{const secret=method==='password'?encrypt({password}):null;
 const row=await db.transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.userId]);const count=(await c.query('SELECT count(*)::int AS total FROM rokbot_accounts WHERE user_id=$1',[req.user.userId])).rows[0].total;if(count>=8)throw Object.assign(Error('Mỗi người dùng tối đa 8 tài khoản ROK.'),{status:400});return(await c.query('INSERT INTO rokbot_accounts(user_id,email,method,secret,config) VALUES($1,$2,$3,$4,$5) RETURNING id,email,method,status',[req.user.userId,email.trim().toLowerCase(),method,secret,JSON.stringify(DEFAULT_CONFIG)])).rows[0];});res.status(201).json(row);
 }catch(e){if(e.code==='23505')return res.status(409).json({message:'Tài khoản này đã được thêm.'});next(e);}
});
router.delete('/accounts/:id',async(req,res,next)=>{
 if(!/^[1-9]\d{0,18}$/.test(req.params.id))return res.status(400).json({message:'Tài khoản không hợp lệ.'});
 try{const removed=await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');return (await c.query('DELETE FROM rokbot_accounts WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.userId])).rows;});if(!removed.length)return res.status(404).json({message:'Không tìm thấy tài khoản.'});res.json({deleted:true});}catch(e){next(e);}
});
router.post('/accounts/:id/reimport',async(req,res,next)=>{
 if(!/^[1-9]\d{0,18}$/.test(req.params.id))return res.status(400).json({message:'Tài khoản không hợp lệ.'});
 try{const updated=await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');const rows=(await c.query("UPDATE rokbot_accounts SET status='pending_login',updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",[req.params.id,req.user.userId])).rows;if(rows.length)await c.query('DELETE FROM rokbot_assignments WHERE account_id=$1',[req.params.id]);return rows;});if(!updated.length)return res.status(404).json({message:'Không tìm thấy tài khoản.'});res.json({queued:true});}catch(e){next(e);}
});
router.put('/accounts/:id/config',async(req,res,next)=>{if(!validateConfig(req.body?.config))return res.status(400).json({message:'Cấu hình không hợp lệ.'});try{const rows=(await db.query('UPDATE rokbot_accounts SET config=$1,updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id',[JSON.stringify(req.body.config),req.params.id,req.user.userId])).rows;if(!rows.length)return res.status(404).json({message:'Không tìm thấy tài khoản.'});res.json({saved:true});}catch(e){next(e);}});
router.post('/run',async(req,res,next)=>{
 const {enabled,config,accountId,governorId,applyOthers=false}=req.body||{};
 if(typeof enabled!=='boolean'||typeof applyOthers!=='boolean'||enabled&&!validateConfig(config))return res.status(400).json({message:'Lệnh không hợp lệ.'});
 try{const result=await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');return require('../utils/rokUserRun').setUserRun(c,req.user.userId,enabled,enabled?{config,accountId,governorId,applyOthers}:null,true);});res.json({enabled,count:result.count});}catch(e){next(e);}
});
router.post('/accounts/:id/governors/:governorId/control',async(req,res,next)=>{
 const {enabled,config,applyOthers=false}=req.body||{};
 if(typeof enabled!=='boolean'||typeof applyOthers!=='boolean'||enabled&&!validateConfig(config))return res.status(400).json({message:'Lệnh hoặc cấu hình không hợp lệ.'});
 try{await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');const account=(await c.query('SELECT governors FROM rokbot_accounts WHERE id=$1 AND user_id=$2 FOR UPDATE',[req.params.id,req.user.userId])).rows[0];if(!account)throw Object.assign(Error('Không tìm thấy tài khoản.'),{status:400});const g=account.governors.find(g=>g.id===req.params.governorId);if(!g)throw Object.assign(Error('Không tìm thấy thống đốc.'),{status:400});const targets=applyOthers?account.governors:[g];if(enabled)await requireSlots(c,req.user.userId,targets.filter(t=>!t.enabled).length);for(const t of targets){if(enabled){t.config=config;if(!t.enabled){t.state='queued';t.next_at=null;}}else{t.state='stopped';}t.enabled=enabled;}await c.query('UPDATE rokbot_accounts SET governors=$1,updated_at=now() WHERE id=$2',[JSON.stringify(account.governors),req.params.id]);await c.query('DELETE FROM rokbot_assignments WHERE account_id=$1',[req.params.id]);});res.json({queued:enabled});}catch(e){next(e);}
});
router.put('/accounts/:id/governors/apply-others',async(req,res,next)=>{
 const {config,sourceId}=req.body||{};
 if(!validateConfig(config)||typeof sourceId!=='string')return res.status(400).json({message:'Cấu hình thống đốc không hợp lệ.'});
 try{const count=await db.transaction(async c=>{const account=(await c.query('SELECT governors FROM rokbot_accounts WHERE id=$1 AND user_id=$2 FOR UPDATE',[req.params.id,req.user.userId])).rows[0];if(!account)throw Object.assign(Error('Không tìm thấy tài khoản.'),{status:400});if(!account.governors.some(g=>g.id===sourceId))throw Object.assign(Error('Không tìm thấy thống đốc đang chọn.'),{status:400});let count=0;for(const g of account.governors)if(g.id!==sourceId){g.config=config;count++;}await c.query('UPDATE rokbot_accounts SET governors=$1,updated_at=now() WHERE id=$2',[JSON.stringify(account.governors),req.params.id]);return count;});res.json({saved:true,count});}catch(e){next(e);}
});
router.put('/accounts/:id/governors/:governorId/config',async(req,res,next)=>{
 if(!validateConfig(req.body?.config)||(req.body.applyOthers!==undefined&&typeof req.body.applyOthers!=='boolean'))return res.status(400).json({message:'Cấu hình thống đốc không hợp lệ.'});
 try{await db.transaction(async c=>{const account=(await c.query('SELECT governors FROM rokbot_accounts WHERE id=$1 AND user_id=$2 FOR UPDATE',[req.params.id,req.user.userId])).rows[0];if(!account)throw Object.assign(Error('Không tìm thấy tài khoản.'),{status:400});const governor=account.governors.find(g=>g.id===req.params.governorId);if(!governor)throw Object.assign(Error('Không tìm thấy thống đốc.'),{status:400});governor.config=req.body.config;if(req.body.applyOthers)for(const g of account.governors)g.config=req.body.config;await c.query('UPDATE rokbot_accounts SET governors=$1,updated_at=now() WHERE id=$2',[JSON.stringify(account.governors),req.params.id]);});res.json({saved:true});}catch(e){next(e);}
});
function isAdmin(userId){return (process.env.ROKBOT_ADMIN_USER_IDS||'').split(',').map(id=>id.trim()).includes(String(userId));}
function admin(req,res,next){if(!isAdmin(req.user.userId))return res.status(403).json({message:'Chỉ quản trị hệ thống được quản lý VPS.'});next();}
router.post('/codes',admin,async(req,res,next)=>{
 const {days,capacity,count=1}=req.body||{};
 if(![30,90,365].includes(days)||![6,10,20,50].includes(capacity)||!Number.isInteger(count)||count<1||count>100)return res.status(400).json({message:'Gói hoặc số lượng mã không hợp lệ.'});
 try{const codes=await db.transaction(async c=>{const codes=[];for(let i=0;i<count;i++){const code='ROK-'+crypto.randomBytes(16).toString('hex').toUpperCase();await c.query('INSERT INTO rokbot_codes(code_hash,days,capacity,created_by) VALUES($1,$2,$3,$4)',[hash(code),days,capacity,req.user.userId]);codes.push(code);}return codes;});res.status(201).json({codes,days,capacity});}catch(e){next(e);}
});
router.get('/codes',admin,async(req,res,next)=>{try{res.json((await db.query('SELECT c.id,c.days,c.capacity,c.created_at,c.redeemed_at,u.email AS redeemed_email FROM rokbot_codes c LEFT JOIN users u ON u.id=c.redeemed_by ORDER BY c.id DESC LIMIT 200')).rows);}catch(e){next(e);}});
router.post('/redeem',async(req,res,next)=>{
 const code=typeof req.body?.code==='string'?req.body.code.trim().toUpperCase():'';
 if(!/^ROK-[A-F0-9]{32}$/.test(code))return res.status(400).json({message:'Mã kích hoạt không hợp lệ.'});
 try{const license=await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');const row=(await c.query('SELECT * FROM rokbot_codes WHERE code_hash=$1 FOR UPDATE',[hash(code)])).rows[0];if(!row||row.redeemed_by)throw Object.assign(Error('Mã không tồn tại hoặc đã được sử dụng.'),{status:400});const previous=await getLicense(req.user.userId,c);if(active(previous)&&row.capacity<previous.capacity)throw Object.assign(Error('Mã có số nhân vật thấp hơn gói hiện tại; mã chưa bị sử dụng.'),{status:400});await c.query('UPDATE rokbot_codes SET redeemed_by=$1,redeemed_at=now() WHERE id=$2',[req.user.userId,row.id]);const result=(await c.query("INSERT INTO rokbot_licenses(user_id,code_id,capacity,expires_at) VALUES($1,$2,$3,now()+$4*interval '1 day') ON CONFLICT(user_id) DO UPDATE SET code_id=EXCLUDED.code_id,capacity=EXCLUDED.capacity,expires_at=CASE WHEN rokbot_licenses.capacity=EXCLUDED.capacity AND rokbot_licenses.expires_at>now() THEN rokbot_licenses.expires_at+$4*interval '1 day' ELSE EXCLUDED.expires_at END RETURNING capacity,expires_at",[req.user.userId,row.id,row.capacity,row.days])).rows[0];if((await getLicense(req.user.userId,c))?.auto_run){try{await require('../utils/rokUserRun').setUserRun(c,req.user.userId,true);}catch(e){if(e.status!==403)throw e;}}return result;});res.json(license);}catch(e){next(e);}
});
router.post('/bots',admin,async(req,res,next)=>{const name=req.body?.name;if(typeof name!=='string'||!name.trim()||name.length>80)return res.status(400).json({message:'Nhập tên VPS.'});try{const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex');await db.query('INSERT INTO rokbot_agents(id,user_id,name,token_hash,pairing_secret) VALUES($1,$2,$3,$4,$5)',[id,req.user.userId,name.trim(),hash(token),encrypt({token})]);res.status(201).json({id,token});}catch(e){next(e);}});
router.post('/bots/:id/pairing',admin,async(req,res,next)=>{
 res.set('Cache-Control','no-store');
 if(!/^[a-f0-9-]{36}$/i.test(req.params.id))return res.status(400).json({message:'Client không hợp lệ.'});
 try{const result=await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(904207)');
  const bot=(await c.query('SELECT id,pairing_secret FROM rokbot_agents WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  if(!bot)throw Object.assign(Error('Không tìm thấy client.'),{status:404});
  if(bot.pairing_secret)return {id:bot.id,token:decrypt(bot.pairing_secret).token};
  if(req.body?.renew!==true)throw Object.assign(Error('Client cũ cần cấp khóa mới. Khóa cũ sẽ hết hiệu lực; cần chọn file JSON mới trong app.'),{status:409,code:'PAIRING_RESET_REQUIRED'});
  const token=crypto.randomBytes(32).toString('hex');
  await c.query("UPDATE rokbot_agents SET token_hash=$1,pairing_secret=$2,status='offline',last_seen=NULL WHERE id=$3",[hash(token),encrypt({token}),bot.id]);
  await c.query('DELETE FROM rokbot_assignments WHERE agent_id=$1',[bot.id]);
  return {id:bot.id,token};
 });res.json(result);}catch(e){next(e);}
});
router.delete('/bots/:id',admin,async(req,res,next)=>{
 if(!/^[a-f0-9-]{36}$/i.test(req.params.id))return res.status(400).json({message:'Client không hợp lệ.'});
 try{await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(904207)');
  const result=await c.query('DELETE FROM rokbot_agents WHERE id=$1 RETURNING id',[req.params.id]);
  if(!result.rows.length)throw Object.assign(Error('Không tìm thấy client.'),{status:404});
 });res.json({deleted:true});}catch(e){next(e);}
});
router.post('/bots/:id/control',admin,(req,res)=>res.status(410).json({message:'Client online tự động nhận nhiệm vụ. Dùng Khởi chạy/Dừng ở tài khoản người dùng để điều khiển farm.'}));
router.post('/bots/:id/capture',admin,async(req,res,next)=>{try{const bot=(await db.query("SELECT id,last_seen>now()-interval '90 seconds' AS online FROM rokbot_agents WHERE id=$1",[req.params.id])).rows[0];if(!bot)return res.status(404).json({message:'Không tìm thấy client.'});if(!bot.online)return res.status(409).json({message:'Client đang offline.'});const requestId=crypto.randomUUID();await db.query('INSERT INTO rokbot_capture(agent_id,request_id) VALUES($1,$2) ON CONFLICT(agent_id) DO UPDATE SET request_id=EXCLUDED.request_id,requested_at=now()',[bot.id,requestId]);res.json({requestId,queued:true});}catch(e){next(e);}});
router.get('/bots/:id/capture',admin,async(req,res,next)=>{try{const row=(await db.query('SELECT request_id,completed_id,requested_at,completed_at,screenshot,message FROM rokbot_capture WHERE agent_id=$1',[req.params.id])).rows[0];if(!row)return res.status(404).json({message:'Chưa có yêu cầu chụp ảnh.'});res.json(row);}catch(e){next(e);}});
router.get('/bots/:id/logs',admin,async(req,res,next)=>{try{res.json((await db.query('SELECT id,version,message,client_at,created_at FROM rokbot_runtime_logs WHERE agent_id=$1 ORDER BY id DESC LIMIT 200',[req.params.id])).rows);}catch(e){next(e);}});
router.get('/bots/:id/diagnostic',admin,async(req,res,next)=>{try{const row=(await db.query('SELECT version,stage,message,screenshot,created_at FROM rokbot_last_error WHERE agent_id=$1',[req.params.id])).rows[0];if(!row)return res.status(404).json({message:'Client chưa gửi ảnh lỗi.'});res.json(row);}catch(e){next(e);}});
router.get('/admin',admin,async(req,res,next)=>{try{
 const bots=(await db.query("SELECT id,name,ip,version,desired,status,last_seen,last_seen>now()-interval '90 seconds' AS online FROM rokbot_agents ORDER BY name")).rows;
 const accounts=(await db.query('SELECT a.id,a.email,a.governors,a.status,u.name AS owner_name FROM rokbot_accounts a JOIN users u ON u.id=a.user_id ORDER BY a.id')).rows;
 const assignments=(await db.query('SELECT account_id,agent_id,expires_at FROM rokbot_assignments WHERE expires_at>now()')).rows;
 const logs=(await db.query('SELECT id,agent_id,account_id,message,created_at FROM rokbot_events ORDER BY id DESC LIMIT 200')).rows;
 const diagnostics=(await db.query('SELECT agent_id,version,stage,message,created_at FROM rokbot_last_error')).rows;
 const activities=(await db.query('SELECT DISTINCT ON (agent_id) agent_id,message,client_at,created_at FROM rokbot_runtime_logs ORDER BY agent_id,id DESC')).rows;
 res.json({capacityPerBot:LIMIT,bots,accounts,assignments,logs,diagnostics,activities});
 }catch(e){next(e);}});
router.use((error,req,res,next)=>{if([400,403,404,409,503].includes(error.status))return res.status(error.status).json({message:error.code==='ROK_CAPACITY_FULL'?error.message:error.status===503?'Dịch vụ mã hóa chưa sẵn sàng.':error.message,...(error.code==='PAIRING_RESET_REQUIRED'?{code:error.code}:{})});next(error);});
module.exports=router;
