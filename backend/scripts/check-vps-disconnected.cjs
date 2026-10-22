const db=require('../config/db');
(async()=>{
 const bots=(await db.query("SELECT id,name,version,status,last_seen,now() AS server_now FROM rokbot_agents WHERE name=$1 OR ip=$1",['103.45.232.194'])).rows;
 for(const b of bots){
  console.log(JSON.stringify(b));
  console.log(JSON.stringify((await db.query('SELECT version,message,client_at,created_at FROM rokbot_runtime_logs WHERE agent_id=$1 ORDER BY id DESC LIMIT 12',[b.id])).rows));
  console.log(JSON.stringify((await db.query('SELECT requested_at,completed_at,message,screenshot IS NOT NULL AS has_image FROM rokbot_capture WHERE agent_id=$1',[b.id])).rows));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.close());
