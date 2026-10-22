const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const db=require('../config/db'),{hash}=require('../utils/rokFleet');
test('heartbeat receives work automatically despite legacy stop and cleans offline assignments',async()=>{
 const old=db.query,oldTx=db.transaction,queries=[],token='a'.repeat(64),id='00000000-0000-0000-0000-000000000001';
 db.query=async(sql,p)=>{
  queries.push(sql);
  if(sql.startsWith('SELECT * FROM rokbot_agents'))return {rows:[{id,user_id:4,desired:'stop',token_hash:hash(token)}]};
  if(sql.startsWith('SELECT desired,token_hash'))return {rows:[{desired:'stop',token_hash:hash(token)}]};
  if(sql.startsWith('SELECT id,status FROM rokbot_agents'))return {rows:[{id,status:'idle'}]};
  if(sql.startsWith('SELECT t.id,t.email'))return {rows:[{id:'1',email:'test@example.invalid',status:'ready',secret:null,governors:[],lease_id:'lease'}]};
  return {rows:[]};
 };db.transaction=fn=>fn({query:db.query});
 const app=express();app.use(express.json());app.use('/api/rok-agent',require('../routes/rokAgentRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/rok-agent/heartbeat',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({version:'test',status:'idle'})});
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.desired,'run');assert.equal(result.tasks.length,1);
  assert.ok(queries.some(s=>s.startsWith('UPDATE rokbot_agents')&&s.includes("desired='run'")));
  assert.ok(queries.some(s=>s.startsWith('SELECT id,status FROM rokbot_agents WHERE last_seen>')));
  assert.ok(queries.some(s=>s.startsWith('DELETE FROM rokbot_assignments a USING rokbot_agents')&&s.includes('b.last_seen<=')));
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTx;}
});
test('heartbeat assigns queued discovery to idle worker while farming stays packed',async()=>{
 const old=db.query,oldTx=db.transaction,token='b'.repeat(64),busy='busy',idle='idle',inserted=[];
 db.query=async(sql,p)=>{
  if(sql.startsWith('SELECT * FROM rokbot_agents'))return {rows:[{id:busy,user_id:4,token_hash:hash(token)}]};
  if(sql.startsWith('SELECT desired,token_hash'))return {rows:[{desired:'run',token_hash:hash(token)}]};
  if(sql.startsWith('SELECT id,status FROM rokbot_agents'))return {rows:[{id:busy,status:'running'},{id:idle,status:'idle'}]};
  if(sql.startsWith('SELECT t.*,a.agent_id'))return {rows:[
   {id:'12',status:'ready',governors:Array.from({length:11},()=>({enabled:true})),agent_id:busy},
   {id:'16',status:'pending_login',governors:[],agent_id:null},
   {id:'17',status:'ready',governors:[{enabled:true}],agent_id:null,license_expires_at:new Date(Date.now()+86400000)}
  ]};
  if(sql.startsWith('INSERT INTO rokbot_assignments'))inserted.push(p);
  return {rows:[]};
 };db.transaction=fn=>fn({query:db.query});
 const app=express();app.use(express.json());app.use('/api/rok-agent',require('../routes/rokAgentRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/rok-agent/heartbeat',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({version:'test',status:'running'})});
  assert.equal(r.status,200);assert.deepEqual(inserted.map(p=>p.slice(0,2)),[['16',idle],['17',busy]]);
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTx;}
});
