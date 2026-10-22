const express=require('express'),crypto=require('crypto');
const db=require('../config/db');const {hash,decrypt,LIMIT,selectAssignmentBin}=require('../utils/rokFleet');
const {active,getLicense}=require('../utils/rokLicense');
const {validResources,mergeResources}=require('../utils/rokResources');
const router=express.Router();
router.use(async(req,res,next)=>{try{const token=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];if(!token)return res.status(401).json({message:'Invalid agent token'});const agent=(await db.query('SELECT * FROM rokbot_agents WHERE token_hash=$1',[hash(token)])).rows[0];if(!agent)return res.status(401).json({message:'Invalid agent token'});req.agent=agent;next();}catch(e){next(e);}});
router.use(require('./rokAgentDiagnosticRoutes'));
router.post('/heartbeat',async(req,res,next)=>{
 const {version,status}=req.body||{};if(typeof version!=='string'||version.length>40||!['idle','running','loading','error'].includes(status))return res.status(400).json({message:'Invalid heartbeat'});
 try{const result=await db.transaction(async c=>{
  const owner=req.agent.user_id;await c.query('SELECT pg_advisory_xact_lock(904207)');
  await c.query("UPDATE rokbot_agents SET ip=$1,version=$2,status=$3,last_seen=now(),desired='run' WHERE id=$4",[req.ip,version,status,req.agent.id]);
  await c.query("DELETE FROM rokbot_assignments a USING rokbot_agents b WHERE a.agent_id=b.id AND (a.expires_at<=now() OR b.last_seen IS NULL OR b.last_seen<=now()-interval '90 seconds')");
  await c.query("DELETE FROM rokbot_assignments a USING rokbot_accounts t WHERE a.account_id=t.id AND t.status='ready' AND NOT EXISTS (SELECT 1 FROM rokbot_licenses l WHERE l.user_id=t.user_id AND l.expires_at>now())");
  const agent=(await c.query('SELECT desired,token_hash FROM rokbot_agents WHERE id=$1',[req.agent.id])).rows[0];
  if(!agent||agent.token_hash!==req.agent.token_hash)throw Object.assign(Error('Client connection revoked'),{status:401});
  await c.query("UPDATE rokbot_assignments SET expires_at=now()+interval '90 seconds' WHERE agent_id=$1 AND expires_at>now()",[req.agent.id]);
  const bots=(await c.query("SELECT id,status FROM rokbot_agents WHERE last_seen>now()-interval '90 seconds' ORDER BY id")).rows;
  const accounts=(await c.query('SELECT t.*,a.agent_id,l.capacity AS license_capacity,l.expires_at AS license_expires_at FROM rokbot_accounts t LEFT JOIN rokbot_licenses l ON l.user_id=t.user_id LEFT JOIN rokbot_assignments a ON a.account_id=t.id ORDER BY t.id')).rows;
  const bins=bots.map(b=>({id:b.id,status:b.status,load:0,accountCount:0,unknown:false}));
  for(const a of accounts.filter(a=>a.agent_id)){const b=bins.find(b=>b.id===a.agent_id);if(b){b.load+=a.governors.length||LIMIT;b.accountCount++;b.unknown ||= !a.governors.length;}}
  const free=accounts.filter(a=>!a.agent_id&&(a.status!=='ready'||active({expires_at:a.license_expires_at})&&a.governors.some(g=>g.enabled))).sort((a,b)=>Number(b.status!=='ready')-Number(a.status!=='ready')||b.governors.length-a.governors.length||Number(a.id)-Number(b.id));
  for(const a of free){const size=a.governors.length;const b=selectAssignmentBin(a,bins);if(!b)continue;await c.query("INSERT INTO rokbot_assignments(account_id,agent_id,lease_id,expires_at) VALUES($1,$2,$3,now()+interval '90 seconds')",[a.id,b.id,crypto.randomUUID()]);b.load=size?b.load+size:LIMIT;b.accountCount++;b.unknown ||= !a.governors.length;}
  const tasks=(await c.query("SELECT t.id,t.email,t.method,t.secret,t.status,t.config,t.governors,a.lease_id,l.expires_at AS license_expires_at FROM rokbot_accounts t JOIN rokbot_assignments a ON a.account_id=t.id LEFT JOIN rokbot_licenses l ON l.user_id=t.user_id WHERE a.agent_id=$1 AND a.expires_at>now() AND (t.status<>'ready' OR (l.expires_at>now() AND EXISTS (SELECT 1 FROM jsonb_array_elements(t.governors) g WHERE g->>'enabled'='true'))) ORDER BY t.id",[req.agent.id])).rows;
  const capture=(await c.query("SELECT request_id FROM rokbot_capture WHERE agent_id=$1 AND completed_id IS DISTINCT FROM request_id AND requested_at>now()-interval '2 minutes'",[req.agent.id])).rows[0];
  return {desired:'run',captureRequest:capture?.request_id||null,leaseSeconds:90,tasks:tasks.map(({secret,...t})=>{const credential=decrypt(secret);return {...t,mode:t.status==='ready'?'farm':'discover',credential:credential?.expires&&credential.expires<Date.now()?null:credential};})};
 });res.json(result);
 }catch(e){next(e);}
});
router.post('/report',async(req,res,next)=>{
 const {accountId,leaseId,status,governors,message,governorId,nextAt,resources}=req.body||{};
 if(!['waiting_code','ready','running','done','error','farm_started','farm_done','farm_error'].includes(status)||!/^\d+$/.test(String(accountId))||typeof leaseId!=='string'||typeof message!=='string'||message.length>500)return res.status(400).json({message:'Invalid report'});
 if(resources!==undefined&&(status!=='farm_done'||!validResources(resources)))return res.status(400).json({message:'Invalid resource snapshot'});
 if(governors!==undefined&&(!Array.isArray(governors)||governors.length>20||governors.some(g=>typeof g?.id!=='string'||!g.id||g.id.length>120||typeof g.name!=='string'||g.name.length>120||(g.power!==undefined&&g.power!==null&&(!Number.isSafeInteger(g.power)||g.power<0)))||new Set(governors.map(g=>g.id)).size!==governors.length))return res.status(400).json({message:'At most 20 unique governors per account supported'});
 try{const released=await db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(904207)');const lease=(await c.query('SELECT a.account_id,t.user_id FROM rokbot_assignments a JOIN rokbot_accounts t ON t.id=a.account_id WHERE a.account_id=$1 AND a.agent_id=$2 AND a.lease_id=$3 AND a.expires_at>now() FOR UPDATE',[accountId,req.agent.id,leaseId])).rows[0];if(!lease)throw Object.assign(Error('Assignment lease expired'),{status:409});
 if(status==='error'){const account=(await c.query('SELECT status FROM rokbot_accounts WHERE id=$1',[accountId])).rows[0];if(account.status==='ready')return false;}
 if(status.startsWith('farm_')){
  if(!active(await getLicense(lease.user_id,c)))throw Object.assign(Error('Farm license expired'),{status:403});
  const data=(await c.query('SELECT governors FROM rokbot_accounts WHERE id=$1',[accountId])).rows[0].governors;
  const g=data.find(g=>g.id===governorId);
  if(!g||!g.enabled)throw Object.assign(Error('Governor stopped or unavailable'),{status:409});
  if(status==='farm_done'&&(!Number.isFinite(nextAt)||nextAt<Date.now()||nextAt>Date.now()+169*3600000))throw Object.assign(Error('Invalid next farm time'),{status:400});
  g.state=status==='farm_started'?'running':status==='farm_done'?'waiting':'error';
  if(status==='farm_done'){g.next_at=nextAt;mergeResources(g,resources);}
  await c.query('UPDATE rokbot_accounts SET governors=$1,updated_at=now() WHERE id=$2',[JSON.stringify(data),accountId]);
  await c.query('INSERT INTO rokbot_events(user_id,agent_id,account_id,message) VALUES($1,$2,$3,$4)',[lease.user_id,req.agent.id,accountId,g.name+': '+({running:'Bắt đầu farm',waiting:'Đã farm xong — chờ lượt tiếp theo',error:'Farm gặp lỗi — cần kiểm tra'}[g.state]||g.state)]);
  return false;
 }
 let merged=governors;
 if(governors!==undefined){const old=(await c.query('SELECT governors FROM rokbot_accounts WHERE id=$1',[accountId])).rows[0].governors;merged=governors.map(g=>{const existing=old.find(o=>o.id===g.id);return {id:g.id,name:g.name,kingdom:typeof g.kingdom==='string'?g.kingdom.slice(0,20):'',power:g.power??existing?.power??null,resources:existing?.resources||null,resources_updated_at:existing?.resources_updated_at||null,config:existing?.config||require('../utils/rokConfig').DEFAULT_CONFIG,enabled:existing?.enabled||false,state:existing?.state||'stopped',next_at:existing?.next_at||null};});}
 await c.query("UPDATE rokbot_accounts SET status=$1::varchar,governors=COALESCE($2::jsonb,governors),secret=CASE WHEN method='code' AND $1::varchar='ready' THEN NULL ELSE secret END,updated_at=now() WHERE id=$3",[status,governors===undefined?null:JSON.stringify(merged),accountId]);
 // Events contain only standardized status, never client passwords or OTPs.
 let released=false;
 if(status==='ready'&&governors!==undefined){const license=await getLicense(lease.user_id,c);if(license?.auto_run&&active(license)){try{const activation=await require('../utils/rokUserRun').setUserRun(c,lease.user_id,true);released=activation.changed.includes(String(accountId));}catch(error){if(error.status!==403)throw error;await c.query('INSERT INTO rokbot_events(user_id,agent_id,account_id,message) VALUES($1,$2,$3,$4)',[lease.user_id,req.agent.id,accountId,'Đã quét nhân vật mới nhưng vượt hạn mức gói; cần nâng gói để chạy tất cả.']);}}}

 if(governors!==undefined){const load=(await c.query('SELECT COALESCE(sum(jsonb_array_length(t.governors)),0)::int AS total FROM rokbot_assignments a JOIN rokbot_accounts t ON t.id=a.account_id WHERE a.agent_id=$1 AND a.account_id<>$2 AND a.expires_at>now()',[req.agent.id,accountId])).rows[0].total;if(load+governors.length>LIMIT){await c.query('DELETE FROM rokbot_assignments WHERE account_id=$1',[accountId]);released=true;}}
 await c.query('INSERT INTO rokbot_events(user_id,agent_id,account_id,message) VALUES($1,$2,$3,$4)',[lease.user_id,req.agent.id,accountId,({waiting_code:'Chờ mã xác minh',ready:'Đã quét và lưu '+(merged||[]).length+' thống đốc ngôi sao',running:'Đang xử lý tài khoản',done:'Đã hoàn tất',error:'Nhiệm vụ gặp lỗi — cần kiểm tra'}[status]||status)]);
 await c.query('DELETE FROM rokbot_events WHERE user_id=$1 AND id NOT IN (SELECT id FROM rokbot_events WHERE user_id=$1 ORDER BY id DESC LIMIT 1000)',[lease.user_id]);return released;});res.json({accepted:true,released});}catch(e){next(e);}
});
router.use((error,req,res,next)=>{if([400,401,403,409,503].includes(error.status))return res.status(error.status).json({message:error.status===503?'Dịch vụ mã hóa chưa sẵn sàng.':error.message});next(error);});
module.exports=router;
