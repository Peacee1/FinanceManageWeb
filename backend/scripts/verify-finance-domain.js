require('dotenv').config();
const db=require('../config/db'),jwt=require('jsonwebtoken');
(async()=>{
 const user=(await db.query("SELECT id FROM users WHERE role='owner' AND is_active IS DISTINCT FROM false AND must_change_password IS DISTINCT FROM true ORDER BY id LIMIT 1")).rows[0];
 const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'2m'});
 const response=await fetch('https://finance.peacee1.io.vn/api/users/bootstrap?month=2026-10',{headers:{Authorization:`Bearer ${token}`,Origin:'https://finance.peacee1.io.vn'}});
 const body=await response.json();
 if(response.status!==200||body.entries?.length!==7||response.headers.get('access-control-allow-origin')!=='https://finance.peacee1.io.vn')throw Error('Bootstrap/origin verification failed');
 const counts=(await db.query('SELECT count(*)::int AS preserved_transactions FROM transactions WHERE business_id IS NULL')).rows[0];
 const tables=(await db.query("SELECT count(*)::int AS retired_tables_remaining FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1)",[['businesses','employees','products','stock_movements','sale_items','business_daily_totals','cafe_tables','cafe_table_sessions','cafe_occupancy_history','bank_connections','bank_payment_intents','bank_events']])).rows[0];
 console.log(JSON.stringify({bootstrapStatus:response.status,resources:body.entries.length,...counts,...tables}));
})().catch(error=>{console.error({message:error.message,code:error.code});process.exitCode=1;}).finally(()=>db.close());
