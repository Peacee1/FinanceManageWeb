const crypto=require('crypto');
const {LIMIT}=require('./rokFleet');
const overloaded=()=>Object.assign(Error('Server đang quá tải. Vui lòng thử lại sau.'),{status:503,code:'ROK_CAPACITY_FULL'});
function planCapacity(accounts,bots,assignments){
 const bins=bots.map(b=>({id:b.id,load:0})),plans=[];
 const wanted=new Set(accounts.filter(a=>a.governors.length).map(a=>String(a.id)));
 const assigned=new Set();
 for(const a of assignments){
  const bin=bins.find(b=>b.id===a.agent_id);if(!bin)continue;
  bin.load+=Number(a.size)||LIMIT;
  if(wanted.has(String(a.account_id))){assigned.add(String(a.account_id));plans.push({accountId:a.account_id,agentId:bin.id,existing:true});}
 }
 for(const a of accounts.filter(a=>a.governors.length&&!assigned.has(String(a.id))).sort((a,b)=>b.governors.length-a.governors.length)){
  const bin=bins.filter(b=>b.load+a.governors.length<=LIMIT).sort((a,b)=>b.load-a.load)[0];
  if(!bin)throw overloaded();
  bin.load+=a.governors.length;plans.push({accountId:a.id,agentId:bin.id,existing:false});
 }
 return plans;
}
async function checkCapacity(c,accounts){
 const bots=(await c.query("SELECT id FROM rokbot_agents WHERE last_seen>now()-interval '90 seconds' ORDER BY id")).rows;
 const assignments=(await c.query("SELECT a.account_id,a.agent_id,jsonb_array_length(t.governors) AS size FROM rokbot_assignments a JOIN rokbot_accounts t ON t.id=a.account_id WHERE a.expires_at>now()")).rows;
 return planCapacity(accounts,bots,assignments);
}
async function reserveCapacity(c,plans,changed){
 for(const p of plans){
  if(p.existing&&!changed.includes(String(p.accountId)))continue;
  await c.query("INSERT INTO rokbot_assignments(account_id,agent_id,lease_id,expires_at) VALUES($1,$2,$3,now()+interval '90 seconds') ON CONFLICT(account_id) DO UPDATE SET agent_id=EXCLUDED.agent_id,lease_id=EXCLUDED.lease_id,expires_at=EXCLUDED.expires_at",[p.accountId,p.agentId,crypto.randomUUID()]);
 }
}
module.exports={planCapacity,checkCapacity,reserveCapacity};
