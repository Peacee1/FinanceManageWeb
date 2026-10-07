const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const db=require('../config/db');
after(()=>db.close());
test('transaction keeps original actor name after profile rename and transaction edit',{skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const rollback=new Error('rollback fixture');
 await assert.rejects(db.transaction(async c=>{
  const user=(await c.query("INSERT INTO users(name,email,password_hash,role) VALUES('Original actor',$1,'test','owner') RETURNING id",[randomUUID()+'@example.invalid'])).rows[0];
  const tx=(await c.query("INSERT INTO transactions(user_id,type,amount,category,date) VALUES($1,'EXPENSE',100,'Test',CURRENT_DATE) RETURNING id,actor_name",[user.id])).rows[0];
  assert.equal(tx.actor_name,'Original actor');
  await c.query("UPDATE users SET name='Renamed actor' WHERE id=$1",[user.id]);
  const updated=(await c.query('UPDATE transactions SET amount=200 WHERE id=$1 RETURNING actor_name',[tx.id])).rows[0];
  assert.equal(updated.actor_name,'Original actor');
  throw rollback;
 }),error=>error===rollback);
});
