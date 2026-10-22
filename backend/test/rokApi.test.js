const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken');
const db=require('../config/db');process.env.JWT_SECRET='rokbot-test-secret-with-more-than-32-characters';
test('ROK endpoints enforce session, owner filters, config limits and private agent tokens',async()=>{
 const old=db.query,oldTransaction=db.transaction;const calls=[];db.transaction=fn=>fn({query:(...args)=>db.query(...args)});
 db.query=async(sql,p)=>{calls.push([sql,p]);if(sql.startsWith('SELECT id, role'))return {rows:[{id:p[0],role:'owner',session_version:0,is_active:true}]};if(sql.startsWith('UPDATE rokbot_accounts')||sql.startsWith('UPDATE rokbot_agents'))return {rows:[]};return {rows:[]};};
 const app=express();app.use(express.json());app.use('/api/rokbot',require('../routes/rokbotRoutes'));app.use('/api/rok-agent',require('../routes/rokAgentRoutes'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;const auth={Authorization:'Bearer '+jwt.sign({userId:2},process.env.JWT_SECRET),'Content-Type':'application/json'};
 try{assert.equal((await fetch(base+'/api/rokbot/overview')).status,401);const r=await fetch(base+'/api/rokbot/overview',{headers:auth});assert.equal(r.status,200);assert.ok(calls.filter(([sql])=>sql.includes('WHERE user_id=$1')).every(([,p])=>p[0]===2));
 assert.equal((await fetch(base+'/api/rokbot/accounts/99/config',{method:'PUT',headers:auth,body:JSON.stringify({config:{}})})).status,400);
 assert.equal((await fetch(base+'/api/rokbot/bots/00000000-0000-0000-0000-000000000001/control',{method:'POST',headers:auth,body:JSON.stringify({desired:'run'})})).status,403);
 assert.equal((await fetch(base+'/api/rokbot/accounts/99',{method:'DELETE',headers:auth})).status,404);
 const deletion=calls.find(([sql])=>sql.startsWith('DELETE FROM rokbot_accounts'));assert.deepEqual(deletion[1],['99',2]);
 assert.equal((await fetch(base+'/api/rokbot/accounts/99/reimport',{method:'POST',headers:auth,body:'{}'})).status,404);
 const reimport=calls.find(([sql])=>sql.includes("status='pending_login'"));assert.deepEqual(reimport[1],['99',2]);
 assert.equal((await fetch(base+'/api/rokbot/logs?accountId=99',{headers:auth})).status,200);
 const logQuery=calls.find(([sql,p])=>sql.includes('e.user_id=$1 AND ($2::bigint'));assert.deepEqual(logQuery[1],[2,'99']);
 assert.equal((await fetch(base+'/api/rokbot/logs?accountId=bad',{headers:auth})).status,400);
 assert.equal((await fetch(base+'/api/rok-agent/heartbeat',{method:'POST',headers:auth,body:'{}'})).status,401);
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTransaction;}
});

test('apply-others copies config only to other governors in owned account',async()=>{
 const old=db.query,oldTx=db.transaction;const source={id:'source',config:{marker:'original'}},other={id:'other',power:123,config:{}};let saved;
 db.query=async(sql,p)=>{if(sql.startsWith('SELECT id, role'))return {rows:[{id:p[0],role:'owner',session_version:0,is_active:true}]};throw Error('Unexpected outer query');};
 db.transaction=fn=>fn({query:async(sql,p)=>{if(sql.startsWith('SELECT governors')){assert.deepEqual(p,['99',2]);return {rows:[{governors:[source,other]}]};}saved=JSON.parse(p[0]);return {rows:[]};}});
 const app=express();app.use(express.json());app.use('/api/rokbot',require('../routes/rokbotRoutes'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const config={allocations:{food:0,wood:2,stone:2,gold:1},level:8,repeatHours:3.6,claimAlliance:true};const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/accounts/99/governors/apply-others',{method:'PUT',headers:{Authorization:'Bearer '+jwt.sign({userId:2},process.env.JWT_SECRET),'Content-Type':'application/json'},body:JSON.stringify({sourceId:'source',config})});assert.equal(r.status,200);assert.equal((await r.json()).count,1);assert.deepEqual(saved[0].config,{marker:'original'});assert.deepEqual(saved[1].config,config);assert.equal(saved[1].power,123);
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTx;}
});
