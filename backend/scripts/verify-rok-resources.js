require('dotenv').config({quiet:true});const db=require('../config/db'),crypto=require('crypto'),assert=require('node:assert/strict'),{hash}=require('../utils/rokFleet');
let userId,codeId;
(async()=>{try{
 userId=(await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Resource test',$1,'not-a-login-password','normal') RETURNING id",[crypto.randomUUID()+'@example.invalid'])).rows[0].id;
 codeId=(await db.query('INSERT INTO rokbot_codes(code_hash,days,capacity,created_by) VALUES($1,30,6,$2) RETURNING id',[hash(crypto.randomUUID()),userId])).rows[0].id;
 await db.query("INSERT INTO rokbot_licenses(user_id,code_id,capacity,expires_at) VALUES($1,$2,6,now()+interval '1 day')",[userId,codeId]);
 const agent=crypto.randomUUID(),lease=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex');
 await db.query("INSERT INTO rokbot_agents(id,user_id,name,token_hash,desired) VALUES($1,$2,'Resource test',$3,'stop')",[agent,userId,hash(token)]);
 const account=(await db.query("INSERT INTO rokbot_accounts(user_id,email,method,config,status,governors) VALUES($1,$2,'password',$3,'ready',$4) RETURNING id",[userId,'test@example.invalid',JSON.stringify(require('../utils/rokConfig').DEFAULT_CONFIG),JSON.stringify([{id:'g1',name:'Test',enabled:true},{id:'g2',name:'Other',enabled:false}])])).rows[0].id;
 await db.query("INSERT INTO rokbot_assignments(account_id,agent_id,lease_id,expires_at) VALUES($1,$2,$3,now()+interval '90 seconds')",[account,agent,lease]);
 const report=resources=>fetch('https://rokbot.peacee1.io.vn/api/rok-agent/report',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({accountId:account,leaseId:lease,status:'farm_done',governorId:'g1',message:'',nextAt:Date.now()+3600000,...(resources!==undefined?{resources}:{})})});
 const snapshot={food:20200000,wood:22300000,stone:19000000,gold:8800000};assert.equal((await report(snapshot)).status,200);
 let data=(await db.query('SELECT governors FROM rokbot_accounts WHERE id=$1',[account])).rows[0].governors;assert.deepEqual(data[0].resources,snapshot);assert.ok(data[0].resources_updated_at);assert.equal(data[1].resources,undefined);
 assert.equal((await report(undefined)).status,200);data=(await db.query('SELECT governors FROM rokbot_accounts WHERE id=$1',[account])).rows[0].governors;assert.deepEqual(data[0].resources,snapshot);
 assert.equal((await report({...snapshot,gold:-1})).status,400);
 console.log('PASS: authenticated completion stores four balances on correct governor, timestamps snapshot, preserves earlier data on missing OCR, rejects invalid balance');
 }finally{if(userId){await db.query('DELETE FROM rokbot_licenses WHERE user_id=$1',[userId]);if(codeId)await db.query('DELETE FROM rokbot_codes WHERE id=$1',[codeId]);await db.query('DELETE FROM users WHERE id=$1',[userId]);}await db.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
