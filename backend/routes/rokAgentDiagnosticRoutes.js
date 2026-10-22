const router=require('express').Router(),db=require('../config/db');
router.get('/diagnostic-status',async(req,res,next)=>{
 try{const row=(await db.query('SELECT message FROM rokbot_last_error WHERE agent_id=$1',[req.agent.id])).rows[0];res.json({message:row?.message||null});}catch(e){next(e);}
});
router.post('/capture',async(req,res,next)=>{
 const b=req.body||{};
 if(typeof b.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.requestId)||typeof b.message!=='string'||b.message.length>500||(b.screenshot!==null&&(typeof b.screenshot!=='string'||b.screenshot.length>80000||!/^\/9j\/[A-Za-z0-9+/=]+$/.test(b.screenshot))))return res.status(400).json({message:'Ảnh không hợp lệ.'});
 try{await db.query('UPDATE rokbot_capture SET completed_id=$2,completed_at=now(),screenshot=$3,message=$4 WHERE agent_id=$1 AND request_id=$2',[req.agent.id,b.requestId,b.screenshot,b.message]);res.json({accepted:true});}catch(e){next(e);}
});
router.post('/runtime-logs',async(req,res,next)=>{
 const b=req.body||{};
 if(typeof b.version!=='string'||b.version.length>40||!Array.isArray(b.logs)||b.logs.length<1||b.logs.length>20||b.logs.some(l=>typeof l.message!=='string'||l.message.length>1000||typeof l.at!=='string'||!Number.isFinite(Date.parse(l.at))))return res.status(400).json({message:'Nhật ký không hợp lệ.'});
 const logs=b.logs.map(l=>({at:new Date(l.at).toISOString(),message:l.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/\b[a-f0-9]{64}\b/gi,'[token]')}));
 try{await db.transaction(async c=>{
  await c.query("INSERT INTO rokbot_runtime_logs(agent_id,version,message,client_at) SELECT $1,$2,e->>'message',(e->>'at')::timestamptz FROM jsonb_array_elements($3::jsonb) e",[req.agent.id,b.version,JSON.stringify(logs)]);
  await c.query('DELETE FROM rokbot_runtime_logs WHERE agent_id=$1 AND id NOT IN (SELECT id FROM rokbot_runtime_logs WHERE agent_id=$1 ORDER BY id DESC LIMIT 200)',[req.agent.id]);
 });res.json({accepted:true});}catch(e){next(e);}
});
router.post('/diagnostic',async(req,res,next)=>{
 const b=req.body||{};
 if(typeof b.version!=='string'||b.version.length>40||typeof b.stage!=='string'||b.stage.length>80||typeof b.message!=='string'||!b.message||b.message.length>2000||
 (b.screenshot!==null&&b.screenshot!==undefined&&(typeof b.screenshot!=='string'||b.screenshot.length>50000||!/^\/9j\/[A-Za-z0-9+/=]+$/.test(b.screenshot))))return res.status(400).json({message:'Ảnh chẩn đoán không hợp lệ.'});
 const message=b.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/\b[a-f0-9]{64}\b/gi,'[token]');
 try{await db.query("INSERT INTO rokbot_last_error(agent_id,version,stage,message,screenshot) VALUES($1,$2,$3,$4,$5) ON CONFLICT(agent_id) DO UPDATE SET version=EXCLUDED.version,stage=EXCLUDED.stage,message=EXCLUDED.message,screenshot=EXCLUDED.screenshot,created_at=now() WHERE rokbot_last_error.message IS DISTINCT FROM EXCLUDED.message AND (rokbot_last_error.created_at<now()-interval '30 seconds' OR $6::boolean)",[req.agent.id,b.version,b.stage,message,b.screenshot||null,b.retryThreshold===true]);res.json({accepted:true});}catch(e){next(e);}
});
module.exports=router;
