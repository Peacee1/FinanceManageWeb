const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken'),db=require('../config/db');
process.env.JWT_SECRET='rokbot-group-test-secret-with-more-than-32-characters';
test('group launch atomically enables all six; quota rejection leaves every governor unchanged',async()=>{
 const oldQuery=db.query,oldTx=db.transaction;let capacity=6,saved=0;
 const governors=Array.from({length:6},(_,i)=>({id:'F'+i,name:'F'+i,enabled:false,state:'stopped'}));
 const cfg={allocations:{food:0,wood:2,stone:2,gold:1},level:8,repeatHours:3.6,claimAlliance:true};
 db.query=async(sql,p)=>({rows:sql.startsWith('SELECT id, role')?[{id:p[0],is_active:true,session_version:0}]:[]});
 db.transaction=fn=>fn({query:async(sql,p)=>{if(sql.includes('rokbot_licenses'))return {rows:[{capacity,expires_at:new Date(Date.now()+86400000)}]};if(sql.startsWith('SELECT governors'))return {rows:[{governors:JSON.parse(JSON.stringify(governors))}]};if(sql.startsWith('UPDATE rokbot_accounts')){saved++;governors.splice(0,6,...JSON.parse(p[0]));}return {rows:[]};}});
 const app=express();app.use(express.json());app.use('/api/rokbot',require('../routes/rokbotRoutes'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=body=>fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/accounts/1/governors/F0/control',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({userId:2},process.env.JWT_SECRET),'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  capacity=5;assert.equal((await call({enabled:true,config:cfg,applyOthers:true})).status,403);assert.equal(saved,0);assert.ok(governors.every(g=>!g.enabled));
  capacity=6;assert.equal((await call({enabled:true,config:cfg,applyOthers:true})).status,200);assert.ok(governors.every(g=>g.enabled&&g.state==='queued'));assert.ok(governors.every(g=>JSON.stringify(g.config)===JSON.stringify(cfg)));
  governors[0].state='running';assert.equal((await call({enabled:true,config:cfg,applyOthers:true})).status,200);assert.equal(governors[0].state,'running');
  assert.equal((await call({enabled:false,applyOthers:true})).status,200);assert.ok(governors.every(g=>!g.enabled&&g.state==='stopped'));
 }finally{await new Promise(r=>server.close(r));db.query=oldQuery;db.transaction=oldTx;}
});
