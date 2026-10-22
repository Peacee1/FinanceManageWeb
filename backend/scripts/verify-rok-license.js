require('dotenv').config({quiet:true});
const db=require('../config/db'),jwt=require('jsonwebtoken'),crypto=require('crypto'),assert=require('node:assert/strict');
const ids=[],codeIds=[];const origin='https://rokbot.peacee1.io.vn';
async function call(userId,path,body){const sv=(await db.query('SELECT session_version FROM users WHERE id=$1',[userId])).rows[0].session_version||0;const r=await fetch(origin+'/api/rokbot/'+path,{method:body?'POST':'GET',headers:{Cookie:'peacee1_session='+jwt.sign({userId,sv},process.env.JWT_SECRET,{expiresIn:'5m'}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
(async()=>{try{
 for(let n=0;n<2;n++)ids.push((await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('License test',$1,'not-a-login-password','normal') RETURNING id",[crypto.randomUUID()+'@example.invalid'])).rows[0].id);
 assert.equal((await call(ids[0],'codes',{days:30,capacity:6})).status,403);
 assert.equal((await call(ids[0],'overview')).body.license,null);
 const admin=Number(process.env.ROKBOT_ADMIN_USER_IDS.split(',')[0]);
 const generated=await call(admin,'codes',{days:30,capacity:6});assert.equal(generated.status,201);const code=generated.body.codes[0];codeIds.push((await db.query('SELECT id FROM rokbot_codes WHERE code_hash=$1',[require('../utils/rokFleet').hash(code)])).rows[0].id);
 const results=await Promise.all(ids.map(id=>call(id,'redeem',{code})));assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);const winner=ids[results.findIndex(r=>r.status===200)];const l=(await call(winner,'overview')).body.license;assert.equal(l.capacity,6);assert.ok(new Date(l.expires_at)-Date.now()>29*86400000);
 assert.equal((await call(winner,'redeem',{code})).status,400);
 let previous=l;
 for(const [days,capacity] of [[30,6],[30,50],[90,50]]){
  const extra='ROK-'+crypto.randomBytes(16).toString('hex').toUpperCase();
  codeIds.push((await db.query('INSERT INTO rokbot_codes(code_hash,days,capacity,created_by) VALUES($1,$2,$3,$4) RETURNING id',[require('../utils/rokFleet').hash(extra),days,capacity,ids[0]])).rows[0].id);
  const redeemed=await call(winner,'redeem',{code:extra});assert.equal(redeemed.status,200);
  assert.equal(redeemed.body.capacity,Math.max(previous.capacity,capacity));
  const base=capacity===previous.capacity?new Date(previous.expires_at).getTime():Date.now();assert.ok(Math.abs(new Date(redeemed.body.expires_at).getTime()-base-days*86400000)<5000);
  previous=redeemed.body;
 }
 const lower='ROK-'+crypto.randomBytes(16).toString('hex').toUpperCase();const lowerId=(await db.query('INSERT INTO rokbot_codes(code_hash,days,capacity,created_by) VALUES($1,30,6,$2) RETURNING id',[require('../utils/rokFleet').hash(lower),ids[0]])).rows[0].id;codeIds.push(lowerId);assert.equal((await call(winner,'redeem',{code:lower})).status,400);assert.equal((await db.query('SELECT redeemed_by FROM rokbot_codes WHERE id=$1',[lowerId])).rows[0].redeemed_by,null);
 await db.query("UPDATE rokbot_licenses SET expires_at=now()-interval '1 second' WHERE user_id=$1",[winner]);assert.equal(require('../utils/rokLicense').active(await require('../utils/rokLicense').getLicense(winner)),false);
 console.log('PASS: admin-only generation, concurrent single-use redemption, same-capacity extension, higher capacity replaces duration, smaller code remains unused, expired license');
 }finally{if(ids.length){await db.query('DELETE FROM rokbot_licenses WHERE user_id=ANY($1::bigint[])',[ids]);if(codeIds.length)await db.query('DELETE FROM rokbot_codes WHERE id=ANY($1::bigint[])',[codeIds]);await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);}await db.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
