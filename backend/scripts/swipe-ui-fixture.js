require('dotenv').config();
const db=require('../config/db'),bcrypt=require('bcrypt');
const email='swipe-ui-fixture-20261003@example.invalid';
(async()=>{if(process.argv[2]==='remove'){
 await db.transaction(async client=>{const user=(await client.query('SELECT id FROM users WHERE email=$1',[email])).rows[0];if(!user)return;await client.query('DELETE FROM transactions WHERE user_id=$1',[user.id]);await client.query('DELETE FROM users WHERE id=$1',[user.id]);});console.log('Swipe fixture removed');
}else{
 const hash=await bcrypt.hash('SwipeFixture!2026',10);
 await db.transaction(async client=>{const user=(await client.query("INSERT INTO users(name,email,password_hash,role) VALUES('Swipe UI fixture',$1,$2,'owner') RETURNING id",[email,hash])).rows[0];await client.query("INSERT INTO transactions(user_id,type,amount,currency,category,date,description) VALUES($1,'EXPENSE',40000,'VND','Ăn uống','2026-10-03','UI swipe fixture'),($1,'INCOME',200000,'VND','Lương','2026-10-03','UI swipe fixture')",[user.id]);});console.log('Synthetic swipe fixture ready');
}})().catch(error=>{console.error({code:error.code});process.exitCode=1;}).finally(()=>db.close());
