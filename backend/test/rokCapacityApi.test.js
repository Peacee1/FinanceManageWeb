const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken'),db=require('../config/db');
process.env.JWT_SECRET='rok-capacity-test-secret-longer-than-32-characters';
test('run returns overload HTTP503 and leaves enabled/config/license unchanged; reserves on success',async()=>{
 const oldQuery=db.query,oldTx=db.transaction;let available=false,writes=0,reserved=0;
 const governors=[{id:'F1',enabled:false}];
 db.query=async(sql,p)=>({rows:sql.startsWith('SELECT id, role')?[{id:p[0],is_active:true,session_version:0}]:[]});
 db.transaction=fn=>fn({query:async(sql,p)=>{
  if(sql.includes('SELECT capacity'))return {rows:[{capacity:6,expires_at:new Date(Date.now()+86400000)}]};
  if(sql.startsWith('SELECT id,governors'))return {rows:[{id:'1',governors:structuredClone(governors)}]};
  if(sql.startsWith('SELECT id FROM rokbot_agents'))return {rows:available?[{id:'agent'}]:[]};
  if(sql.startsWith('UPDATE'))writes++;
  if(sql.startsWith('INSERT INTO rokbot_assignments'))reserved++;
  return {rows:[]};
 }});
 const app=express();app.use(express.json());app.use('/api/rokbot',require('../routes/rokbotRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=()=>fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/run',{method:'POST',headers:{Authorization:'Bearer '+jwt.sign({userId:2},process.env.JWT_SECRET),'Content-Type':'application/json'},body:JSON.stringify({enabled:true,accountId:'1',governorId:'F1',config:{allocations:{food:5,wood:0,stone:0,gold:0},level:8,repeatHours:3.6,claimAlliance:true}})});
 try{const r=await call();assert.equal(r.status,503);assert.match((await r.json()).message,/Server đang quá tải/);assert.equal(writes,0);assert.equal(reserved,0);
 available=true;assert.equal((await call()).status,200);assert.equal(reserved,1);assert.ok(writes>0);
 }finally{await new Promise(r=>server.close(r));db.query=oldQuery;db.transaction=oldTx;}
});
