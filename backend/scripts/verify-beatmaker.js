require('dotenv').config({quiet:true});
const {randomUUID,randomBytes}=require('crypto');
const jwt=require('jsonwebtoken');
const db=require('../config/db');
const assert=require('assert/strict');
const origin='https://beatmaker.peacee1.io.vn';
const ids=[];
const project={name:'Deployment test',bpm:100,swing:20,master:70,tracks:Array.from({length:6},()=>({steps:Array(16).fill(false),mute:false,volume:.5})),melody:{voice:'triangle',volume:.4,mute:false,notes:[{pitch:69,start:0,length:4}]}};
(async()=>{
 try{
  assert.equal((await fetch(origin+'/api/beatmaker/project')).status,401);
  for(let i=0;i<2;i++)ids.push((await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Beat test',$1,$2,'normal') RETURNING id",[randomUUID()+'@example.invalid',await require('bcrypt').hash(randomBytes(32).toString('hex'),4)])).rows[0].id);
  const cookies=ids.map(userId=>'peacee1_session='+jwt.sign({userId,sv:0},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'2m'}));
  const call=(index,body,site=origin)=>fetch(site+'/api/beatmaker/project',{method:body?'PUT':'GET',headers:{Cookie:cookies[index],Origin:site,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const identity=await fetch('https://peacee1.io.vn/api/auth/session',{headers:{Cookie:cookies[0]}});assert.equal(identity.status,200);assert.equal((await identity.json()).user.id,ids[0]);
  assert.equal((await call(0,{project,revision:0})).status,200);
  const loaded=await (await call(0)).json();assert.deepEqual(loaded.project,project);assert.equal(loaded.revision,1);
  assert.equal((await (await call(1)).json()).project,null);
  assert.equal((await call(1,{project,revision:1,userId:ids[0]})).status,409);
  assert.equal((await call(0,{project,revision:0})).status,409);
  const rejected=await fetch(origin+'/api/beatmaker/project',{method:'PUT',headers:{Cookie:cookies[0],Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({project,revision:1})});assert.equal(rejected.status,403);
  const html=await (await fetch(origin)).text();assert.ok(html.includes('piano-roll'));assert.ok(html.includes('project.js'));
  const auth=await (await fetch('https://peacee1.io.vn/auth.js')).text();assert.ok(auth.includes('beatmaker.peacee1.io.vn'));
  const portal=await (await fetch('https://peacee1.io.vn/')).text();assert.ok(portal.includes('https://beatmaker.peacee1.io.vn/'));assert.ok(portal.includes('https://drums.peacee1.io.vn/'));
  console.log('PASS: HTTPS, shared identity, private persistence, user isolation, stale write protection, CSRF, piano roll and portal links');
 }finally{if(ids.length)await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);await db.close();}
})().catch(error=>{console.error('Beatmaker verification failed:',error.message);process.exitCode=1;});
