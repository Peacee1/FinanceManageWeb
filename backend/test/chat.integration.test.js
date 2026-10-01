const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('crypto');
const db=require('../config/db');
const {chatTransaction}=require('../controllers/chatController');
after(()=>db.close());
test('personal chat writes exactly once, isolates owners, rejects employees and respects wallets',{skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const ids=[];
 const call=async(user,body)=>{const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await chatTransaction({user,body},res,e=>{throw e;});return res;};
 try{
  for(let i=0;i<2;i++)ids.push((await db.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',['Chat integration',`chat-${randomUUID()}@example.invalid`,'invalid-hash','owner'])).rows[0].id);
  const a={userId:ids[0],role:'owner'},b={userId:ids[1],role:'owner'};
  const body={message:'nay mua hành 12k',requestId:randomUUID(),userId:ids[1],businessId:123};
  const first=await call(a,body);assert.equal(first.code,201);assert.equal(Number(first.body.transaction.amount),12000);
  const retries=await Promise.all([call(a,body),call(a,body)]);for(const retry of retries){assert.equal(retry.code,200);assert.equal(retry.body.transaction.id,first.body.transaction.id);}
  assert.equal((await call(a,{...body,message:'nay mua hành 15k'})).code,409);
  assert.equal((await call({...a,role:'employee'},body)).code,403);
  const second=await call(b,body);assert.equal(second.code,201);assert.notEqual(second.body.transaction.id,first.body.transaction.id);
  await db.query('UPDATE users SET separate_personal_wallets=true WHERE id=$1',[ids[0]]);
  const salary={message:'nay có lương 20m',requestId:randomUUID()};
  assert.equal((await call(a,salary)).body.needsPayment,true);
  const saved=await call(a,{...salary,paymentMethod:'TRANSFER'});assert.equal(saved.code,201);assert.equal(saved.body.transaction.payment_method,'TRANSFER');
  assert.equal((await call(a,{message:'chưa mua hành 12k',requestId:randomUUID()})).body.transaction,undefined);
  assert.equal((await call(a,{...salary,requestId:randomUUID(),draftToken:'forged'})).code,400);
  const records=await db.query('SELECT user_id,business_id,bank_payment_status FROM transactions WHERE user_id=ANY($1::int[])',[ids]);
  assert.equal(records.rows.length,3);for(const record of records.rows){assert.equal(record.business_id,null);assert.equal(record.bank_payment_status,'MANUAL');}
 }finally{await db.query('DELETE FROM transactions WHERE user_id=ANY($1::int[])',[ids]);await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);}
});
