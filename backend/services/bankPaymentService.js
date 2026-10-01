const { randomUUID,randomBytes } = require('crypto');
const failure=(status,message) => Object.assign(new Error(message),{ status });
const isUuid=value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function publicIntent(row) {
  if (!row) return null;
  const expired=row.status==='WAITING' && new Date(row.expires_at)<=new Date();
  const qr=new URL('https://vietqr.app/img');
  for (const [key,value] of Object.entries({ acc:row.account_number,bank:row.bank_code,amount:row.amount,des:row.code })) qr.searchParams.set(key,value);
  return { id:row.id,transactionId:row.transaction_id,code:row.code,amount:Number(row.amount),status:expired ? 'EXPIRED' : row.status,expiresAt:row.expires_at,bank:row.bank_code,accountNumber:row.account_number,accountName:row.account_name,qrUrl:qr.toString() };
}
async function prepareBankPayment(client,transaction,session=null) {
  if (transaction.bank_payment_status!=='WAITING') return null;
  const previous=(await client.query('SELECT * FROM bank_payment_intents WHERE transaction_id=$1',[transaction.id])).rows[0];
  if (previous) return publicIntent(previous);
  const connection=(await client.query('SELECT * FROM bank_connections WHERE business_id=$1 AND enabled FOR SHARE',[transaction.business_id])).rows[0];
  if (!connection) throw failure(409,'Kết nối ngân hàng vừa thay đổi. Vui lòng thử lại.');
  const intent=(await client.query(`INSERT INTO bank_payment_intents(id,business_id,connection_id,transaction_id,created_by,session_id,table_id,code,amount,bank_code,account_number,account_name)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[randomUUID(),transaction.business_id,connection.id,transaction.id,transaction.user_id,session?.id || null,session?.table_id || null,`CF${randomBytes(10).toString('hex').toUpperCase()}`,transaction.amount,connection.bank_code,connection.account_number,connection.account_name])).rows[0];
  return publicIntent(intent);
}
async function lockIntent(client,id) {
  const initial=(await client.query('SELECT * FROM bank_payment_intents WHERE id=$1',[id])).rows[0];
  if (!initial) throw failure(404,'Không tìm thấy yêu cầu thanh toán.');
  // Every path locks table -> intent -> session -> transaction to avoid deadlocks.
  if (initial.table_id) await client.query('SELECT id FROM cafe_tables WHERE id=$1 FOR UPDATE',[initial.table_id]);
  return (await client.query('SELECT * FROM bank_payment_intents WHERE id=$1 FOR UPDATE',[id])).rows[0];
}
async function settleIntent(client,intent,event,allowLate=false) {
  if (intent.status==='PAID') return 'DUPLICATE_PAYMENT';
  if (intent.status!=='WAITING') return 'CANCELLED';
  if (event.bank_code!==intent.bank_code || event.account_number!==intent.account_number || event.direction!=='in') return 'WRONG_ACCOUNT';
  if (Number(event.amount)!==Number(intent.amount)) return 'AMOUNT_MISMATCH';
  if (!allowLate && (new Date(event.occurred_at)>new Date(intent.expires_at) || new Date(event.occurred_at)<new Date(intent.created_at)-60000)) return 'EXPIRED';
  if (intent.session_id) {
    const table=(await client.query('SELECT current_session_id,is_occupied,deleted_at FROM cafe_tables WHERE id=$1',[intent.table_id])).rows[0];
    const session=(await client.query('SELECT * FROM cafe_table_sessions WHERE id=$1 FOR UPDATE',[intent.session_id])).rows[0];
    if (!table || table.deleted_at || !table.is_occupied || table.current_session_id!==intent.session_id || !session || session.closed_at || session.transaction_id!==intent.transaction_id) return 'SESSION_CHANGED';
    await client.query("UPDATE cafe_table_sessions SET closed_at=quoted_at,paid_by=$1,payment_method='TRANSFER' WHERE id=$2",[intent.created_by,intent.session_id]);
    await client.query('UPDATE cafe_tables SET is_occupied=false,current_session_id=NULL,version=version+1,updated_by=$1,updated_at=now() WHERE id=$2',[intent.created_by,intent.table_id]);
  }
  await client.query("UPDATE transactions SET bank_payment_status='VERIFIED',bank_verified_at=clock_timestamp() WHERE id=$1",[intent.transaction_id]);
  await client.query("UPDATE bank_payment_intents SET status='PAID',paid_at=clock_timestamp() WHERE id=$1",[intent.id]);
  return 'MATCHED';
}
module.exports = { failure,isUuid,publicIntent,prepareBankPayment,lockIntent,settleIntent };
