const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken');
const db=require('../config/db'),{hash,decrypt}=require('../utils/rokFleet');
process.env.JWT_SECRET='agent-admin-test-secret-with-more-than-32-chars';process.env.ROKBOT_ADMIN_USER_IDS='4';process.env.ROKBOT_ENCRYPTION_KEY='ab'.repeat(32);
test('admin pairing download, explicit legacy rotation and client deletion',async()=>{
 const old=db.query,oldTx=db.transaction,queries=[],bots=new Map();
 const id='00000000-0000-0000-0000-000000000001';bots.set(id,{id,pairing_secret:null,token_hash:hash('old')});
 db.query=async(sql,p)=>{
  queries.push([sql,p]);
  if(sql.startsWith('SELECT id, role'))return {rows:[{id:p[0],session_version:0,is_active:true}]};
  if(sql.startsWith('SELECT id,pairing_secret'))return {rows:bots.has(p[0])?[bots.get(p[0])]:[]};
  if(sql.startsWith('INSERT INTO rokbot_agents')){bots.set(p[0],{id:p[0],token_hash:p[3],pairing_secret:p[4]});return {rows:[]};}
  if(sql.startsWith('UPDATE rokbot_agents SET token_hash')){Object.assign(bots.get(p[2]),{token_hash:p[0],pairing_secret:p[1]});return {rows:[]};}
  if(sql.startsWith('DELETE FROM rokbot_agents'))return {rows:bots.delete(p[0])?[{id:p[0]}]:[]};
  return {rows:[]};
 };db.transaction=fn=>fn({query:db.query});
 const app=express();app.use(express.json());app.use('/api/rokbot',require('../routes/rokbotRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=(path,body={},method='POST',user=4)=>fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/'+path,{method,headers:{Authorization:'Bearer '+jwt.sign({userId:user},process.env.JWT_SECRET),'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  for(const user of [4,2]){
   const permission=await fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/permissions',{headers:{Authorization:'Bearer '+jwt.sign({userId:user},process.env.JWT_SECRET)}});
   assert.equal(permission.status,200);assert.deepEqual(await permission.json(),{isAdmin:user===4});
   const dashboard=await fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/admin',{headers:{Authorization:'Bearer '+jwt.sign({userId:user},process.env.JWT_SECRET)}});
   assert.equal(dashboard.status,user===4?200:403);
   if(user===4)assert.deepEqual((await dashboard.json()).activities,[]);
  }
  assert.equal((await call('bots/'+id+'/pairing',{},'POST',2)).status,403);
  for(const suffix of ['logs','diagnostic','capture']){
   const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/rokbot/bots/'+id+'/'+suffix,{headers:{Authorization:'Bearer '+jwt.sign({userId:2},process.env.JWT_SECRET)}});
   assert.equal(r.status,403);
  }
  const first=await call('bots/'+id+'/pairing');assert.equal(first.status,409);assert.equal((await first.json()).code,'PAIRING_RESET_REQUIRED');assert.equal(bots.get(id).pairing_secret,null);
  const rotated=await call('bots/'+id+'/pairing',{renew:true});assert.equal(rotated.status,200);assert.equal(rotated.headers.get('cache-control'),'no-store');const data=await rotated.json();
  assert.equal(data.id,id);assert.equal(bots.get(id).token_hash,hash(data.token));assert.equal(decrypt(bots.get(id).pairing_secret).token,data.token);assert.ok(!bots.get(id).pairing_secret.includes(data.token));
  assert.deepEqual(await (await call('bots/'+id+'/pairing')).json(),data);
  const created=await (await call('bots',{name:'New client'})).json();assert.equal(decrypt(bots.get(created.id).pairing_secret).token,created.token);
  assert.equal((await call('bots/'+id,{},'DELETE',2)).status,403);
  assert.equal((await call('bots/'+id,{},'DELETE')).status,200);assert.equal(bots.has(id),false);
  assert.equal((await call('bots/'+id+'/pairing')).status,404);assert.equal((await call('bots/'+id,{},'DELETE')).status,404);
  assert.ok(!queries.some(([s])=>s.startsWith('DELETE FROM rokbot_accounts')));
  assert.ok(queries.some(([s])=>s==='DELETE FROM rokbot_assignments WHERE agent_id=$1'));
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTx;}
});
