const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const db=require('../config/db');
const sessions=require('../services/nativeSessionService');
const {updateSettings,getProfile}=require('../controllers/userController');
const {addTransaction}=require('../controllers/transactionController');
after(()=>db.close());

test('native session rotation, retries, revocation and account invalidation', {skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 let user;
 try{
  user=(await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Session test',$1,'not-a-password','owner') RETURNING *",[`${randomUUID()}@example.invalid`])).rows[0];
  const token=await sessions.createNativeSession(user);
  const stored=(await db.query('SELECT * FROM native_sessions WHERE user_id=$1',[user.id])).rows[0];
  assert.notEqual(stored.token_hash,token);assert.equal(stored.token_hash,sessions.hashToken(token));
  const first=await sessions.refreshNativeSession(token);assert.equal(first.user.id,user.id);assert.notEqual(first.refreshToken,token);
  const retry=await sessions.refreshNativeSession(token);assert.equal(retry.refreshToken,first.refreshToken);
  const second=await sessions.refreshNativeSession(first.refreshToken);assert.notEqual(second.refreshToken,first.refreshToken);
  await sessions.revokeNativeSession(second.refreshToken);assert.equal(await sessions.refreshNativeSession(second.refreshToken),null);
  const fresh=await sessions.createNativeSession(user);await db.query('UPDATE users SET session_version=session_version+1 WHERE id=$1',[user.id]);assert.equal(await sessions.refreshNativeSession(fresh),null);
  user.session_version++;
  const replay=await sessions.createNativeSession(user),rotated=await sessions.refreshNativeSession(replay);
  await db.query("UPDATE native_sessions SET previous_valid_until=now()-interval '1 minute' WHERE previous_hash=$1",[sessions.hashToken(replay)]);
  assert.equal(await sessions.refreshNativeSession(replay),null);assert.equal(await sessions.refreshNativeSession(rotated.refreshToken),null);
  const expired=await sessions.createNativeSession(user);await db.query("UPDATE native_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[sessions.hashToken(expired)]);assert.equal(await sessions.refreshNativeSession(expired),null);
  assert.equal(await sessions.refreshNativeSession('invalid'),null);
 }finally{if(user){await db.query('DELETE FROM native_sessions WHERE user_id=$1',[user.id]);await db.query('DELETE FROM users WHERE id=$1',[user.id]);}}
});

test('notification money format handles VND, fractional currencies and legacy text', {skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const row=(await db.query("SELECT format_notification_amount(85000,'VND') AS vnd,format_notification_amount(12345,'USD') AS usd,format_notification_amount(53000,'JPY') AS jpy")).rows[0];
 assert.equal(row.vnd,'85.000 ₫');assert.equal(row.usd,'123.45 USD');assert.equal(row.jpy,'53.000 JPY');
 const damaged=(await db.query("SELECT count(*)::int AS count FROM notifications WHERE kind IN ('income_added','expense_added') AND message ~ ' đã ghi [0-9]+\\.0{3,} VND'")).rows[0].count;
 assert.equal(damaged,0);
});

test('expense-only defaults to true and settings validate and isolate users', {skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const ids=[];
 const invoke=async(userId,body)=>{const res={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};await updateSettings({user:{userId,role:'owner'},body},res,error=>{throw error;});return res;};
 try{
  for(let index=0;index<2;index++)ids.push((await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Preference test',$1,'not-a-password','owner') RETURNING id,expense_only",[`${randomUUID()}@example.invalid`])).rows[0]);
  assert.equal(ids[0].expense_only,true);
  assert.equal((await invoke(ids[0].id,{expenseOnly:'false'})).statusCode,400);
  assert.equal((await invoke(ids[0].id,{expenseOnly:false})).statusCode,200);
  const rows=(await db.query('SELECT id,expense_only FROM users WHERE id=ANY($1::int[]) ORDER BY id',[ids.map(row=>row.id)])).rows;
  assert.equal(rows[0].expense_only,false);assert.equal(rows[1].expense_only,true);
  const res={json(data){this.body=data;}};await getProfile({user:{userId:ids[0].id}},res,error=>{throw error;});assert.equal(res.body.expense_only,false);
  const requestId=randomUUID(),body={requestId,type:'EXPENSE',amount:85000,currency:'VND',category:'Ăn uống',date:'2026-10-07',paymentMethod:'TRANSFER'};
  const add=async(payload)=>{const response={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};await addTransaction({user:{userId:ids[0].id,role:'owner'},familyMembership:null,body:payload,query:{}},response,error=>{throw error;});return response;};
  const first=await add(body),retry=await add(body);assert.equal(first.statusCode,201);assert.equal(retry.statusCode,200);assert.equal(first.body.id,retry.body.id);
  assert.equal((await add({...body,amount:90000})).statusCode,409);
  const notice=(await db.query("SELECT message FROM notifications WHERE user_id=$1 AND event_key=$2",[ids[0].id,'transaction:'+first.body.id])).rows;
  assert.equal(notice.length,1);assert.ok(notice[0].message.includes('85.000 ₫'));
 }finally{if(ids.length){await db.query('DELETE FROM transactions WHERE user_id=ANY($1::int[])',[ids.map(row=>row.id)]);await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids.map(row=>row.id)]);}}
});
