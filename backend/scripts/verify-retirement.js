const fs=require('fs');
const db=require('../config/db');
const migration=fs.readFileSync(process.argv[2],'utf8');
const fingerprint=`SELECT count(*)::int AS count,md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY id),'')) AS hash FROM transactions t WHERE business_id IS NULL`;
(async()=>{
 const rollback=new Error('Verified rollback');
 try {await db.transaction(async client=>{
  const before=(await client.query(fingerprint)).rows[0];
  await client.query(migration);
  const after=(await client.query(fingerprint)).rows[0];
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Personal/family records changed');
  console.log(JSON.stringify({dryRun:true,preservedTransactions:after.count,identical:true}));
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
})().catch(error=>{console.error({code:error.code,message:error.message});process.exitCode=1;}).finally(()=>db.close());
