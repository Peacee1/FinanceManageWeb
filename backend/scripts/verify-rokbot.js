require('dotenv').config({quiet:true});
const {randomUUID,randomBytes}=require('crypto'),jwt=require('jsonwebtoken'),assert=require('node:assert/strict'),db=require('../config/db');
const origin='https://rokbot.peacee1.io.vn',ids=[];
(async()=>{try{
 assert.equal((await fetch(origin+'/api/rokbot/overview')).status,401);
 for(let i=0;i<2;i++)ids.push((await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('ROK deploy test',$1,$2,'normal') RETURNING id",[randomUUID()+'@example.invalid',await require('bcrypt').hash(randomBytes(32).toString('hex'),4)])).rows[0].id);
 const tokens=ids.map(userId=>jwt.sign({userId,sv:0},process.env.JWT_SECRET,{expiresIn:'5m'}));
 const call=(i,path,body,method='POST',site=origin)=>fetch(origin+'/api/rokbot/'+path,{method:body?method:'GET',headers:{Cookie:'peacee1_session='+tokens[i],Origin:site,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const accounts=[];for(let i=0;i<3;i++){const r=await call(0,'accounts',{email:'rok-test-'+randomUUID()+'@example.invalid',method:'password',password:'deployment-test-only'});assert.equal(r.status,201);accounts.push(await r.json());}
 assert.equal((await call(0,'accounts',{email:'extra@example.invalid',method:'password',password:'test'})).status,400);
 assert.equal((await call(0,'accounts/'+accounts[0].id+'/config',{config:{allocations:{food:1,wood:2,stone:2,gold:0},level:8,repeatHours:2,claimAlliance:true}},'PUT')).status,200);
 assert.equal((await call(1,'accounts/'+accounts[0].id+'/config',{config:{allocations:{food:1,wood:2,stone:2,gold:0},level:8,repeatHours:2,claimAlliance:true}},'PUT')).status,404);
 const overview=await(await call(0,'overview')).json();assert.equal(overview.accounts.length,3);assert.ok(!JSON.stringify(overview).includes('deployment-test-only'));assert.ok(overview.accounts.every(a=>!('secret' in a)));assert.equal((await(await call(1,'overview')).json()).accounts.length,0);
 assert.equal((await call(0,'bots',{name:'test'})).status,403);
 assert.equal((await call(0,'accounts/'+accounts[0].id+'/config',{config:overview.accounts[0].config},'PUT','https://untrusted.example')).status,403);
 const sizes=[6,6,8];for(let i=0;i<3;i++)await db.query('UPDATE rokbot_accounts SET governors=$1 WHERE id=$2',[JSON.stringify(Array.from({length:sizes[i]},(_,n)=>({id:String(n),name:'F'+n}))),accounts[i].id]);
 const botId=randomUUID(),token=randomBytes(32).toString('hex');await db.query("INSERT INTO rokbot_agents(id,user_id,name,token_hash,desired) VALUES($1,$2,'deployment-test-vps',$3,'run')",[botId,ids[0],require('../utils/rokFleet').hash(token)]);
 const heartbeat=()=>fetch(origin+'/api/rok-agent/heartbeat',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({version:'test',status:'idle'})});
 const hr=await heartbeat();assert.equal(hr.status,200);const fleet=await hr.json();assert.equal(fleet.tasks.filter(t=>accounts.some(a=>a.id===t.id)).length,3);assert.equal(fleet.tasks.reduce((n,t)=>n+t.governors.length,0),20);assert.ok(fleet.tasks.every(t=>t.credential.password==='deployment-test-only'));
 const ip=(await db.query('SELECT ip FROM rokbot_agents WHERE id=$1',[botId])).rows[0].ip;assert.ok(ip&&ip!=='127.0.0.1');
 await db.query("UPDATE rokbot_assignments SET expires_at=now()-interval '1 second' WHERE agent_id=$1",[botId]);const task=fleet.tasks[0];const late=await fetch(origin+'/api/rok-agent/report',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({accountId:task.id,leaseId:task.lease_id,status:'done',message:''})});assert.equal(late.status,409);
 const html=await(await fetch(origin)).text();assert.ok(!html.includes('bots-panel'));assert.ok(html.includes('rok-password'));assert.ok(!html.includes('value="code"'));
 console.log('PASS: HTTPS, Peacee1-only, 3-account cap, encrypted secrets, tenant isolation, CSRF, admin-only VPS, 6+6+8 allocation, IP, stale-lease rejection');
 }finally{if(ids.length)await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);await db.close();}})().catch(e=>{console.error('ROK verification failed:',e.message);process.exitCode=1;});
