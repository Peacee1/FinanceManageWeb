const db=require('../config/db');
const { randomUUID,randomBytes,createHash }=require('crypto');
const { transactionScope }=require('../utils/transactionScope');
const { isPositiveInteger,isDate }=require('../utils/validation');
const { encryptSecret,decryptSecret,validSignature,paymentOrigin }=require('../utils/bankSecurity');
const { failure,isUuid,publicIntent,lockIntent,settleIntent }=require('../services/bankPaymentService');
const banks={ MBBank:['MB','MBBANK'],Vietcombank:['VCB','VIETCOMBANK'],BIDV:['BIDV'],ACB:['ACB'],Techcombank:['TCB','TECHCOMBANK'],TPBank:['TPB','TPBANK'],VPBank:['VPB','VPBANK'] };
const canonicalBank=value => Object.keys(banks).find(bank => banks[bank].includes(String(value).toUpperCase()));
const safeConnection=row => row ? { id:row.id,bank:row.bank_code,accountNumber:row.account_number,accountName:row.account_name,enabled:row.enabled,webhookUrl:paymentOrigin() ? `${paymentOrigin()}/api/payments/sepay/${row.id}` : null } : null;
async function scope(req) {
  const result=await transactionScope({ ...req,query:{ ...req.query,scope:'business' } });
  if (result.error) throw failure(result.error,result.message);
  return result.businessId;
}
function fail(error,res,next) {
  if (error.code==='23505') return res.status(409).json({ message:'Tài khoản ngân hàng đã được kết nối với doanh nghiệp khác.' });
  if (error.status) return res.status(error.status).json({ message:error.message });
  next(error);
}
async function getConnection(req,res,next) {
  try {
    const businessId=await scope(req);
    const row=(await db.query('SELECT * FROM bank_connections WHERE business_id=$1',[businessId])).rows[0];
    res.json({ connection:safeConnection(row),banks:Object.keys(banks),ready:Boolean(paymentOrigin() && req.secure) });
  } catch(error) { fail(error,res,next); }
}
async function saveConnection(req,res,next) {
  if (!req.secure || !paymentOrigin()) return res.status(503).json({ message:'Cần tên miền HTTPS và cấu hình server trước khi kết nối ngân hàng.' });
  const { bank,accountNumber,accountName,enabled,confirmedLiveConnection,rotateSecret=false }=req.body || {};
  if (!banks[bank] || !/^\d{6,30}$/.test(accountNumber || '') || typeof accountName!=='string' || !accountName.trim() || accountName.length>100 || typeof enabled!=='boolean' || typeof rotateSecret!=='boolean' || (enabled && confirmedLiveConnection!==true)) return res.status(400).json({ message:'Kiểm tra ngân hàng, số tài khoản, tên chủ tài khoản và xác nhận cấu hình SePay Live.' });
  try {
    const businessId=await scope(req);
    let secret;
    const row=await db.transaction(async client => {
      await client.query('SELECT id FROM businesses WHERE id=$1 FOR UPDATE',[businessId]);
      const current=(await client.query('SELECT * FROM bank_connections WHERE business_id=$1 FOR UPDATE',[businessId])).rows[0];
      if (current) {
        const pending=(await client.query("SELECT 1 FROM bank_payment_intents WHERE connection_id=$1 AND status='WAITING' LIMIT 1",[current.id])).rows[0];
        if (pending && (current.bank_code!==bank || current.account_number!==accountNumber || !enabled || rotateSecret)) throw failure(409,'Có yêu cầu chuyển khoản đang chờ. Hãy đối soát hoặc huỷ chúng trước khi đổi kết nối.');
      }
      if (!current || rotateSecret) secret=randomBytes(32).toString('hex');
      const encrypted=secret ? encryptSecret(secret) : current.secret_ciphertext;
      return (await client.query(`INSERT INTO bank_connections(id,business_id,bank_code,account_number,account_name,secret_ciphertext,enabled) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(business_id) DO UPDATE SET bank_code=EXCLUDED.bank_code,account_number=EXCLUDED.account_number,account_name=EXCLUDED.account_name,secret_ciphertext=EXCLUDED.secret_ciphertext,enabled=EXCLUDED.enabled,updated_at=now() RETURNING *`,[current?.id || randomUUID(),businessId,bank,accountNumber,accountName.trim(),encrypted,enabled])).rows[0];
    });
    res.setHeader('Cache-Control','no-store'); res.json({ connection:safeConnection(row),...(secret ? { webhookSecret:secret } : {}) });
  } catch(error) { fail(error,res,next); }
}
async function getIntent(req,res,next) {
  if (!isUuid(req.params.id)) return res.status(400).json({ message:'Mã thanh toán không hợp lệ.' });
  try {
    const businessId=await scope(req);
    const row=(await db.query('SELECT * FROM bank_payment_intents WHERE id=$1 AND business_id=$2 AND ($3::int IS NULL OR created_by=$3 OR session_id IS NOT NULL)',[req.params.id,businessId,req.user.role==='employee' ? req.user.userId : null])).rows[0];
    if (!row) throw failure(404,'Không tìm thấy yêu cầu thanh toán.');
    res.json({ payment:publicIntent(row) });
  } catch(error) { fail(error,res,next); }
}
async function listIntents(req,res,next) {
  if (req.query.cursor && !isUuid(req.query.cursor)) return res.status(400).json({ message:'Phân trang không hợp lệ.' });
  try {
    const businessId=await scope(req);
    const rows=(await db.query(`SELECT * FROM bank_payment_intents WHERE business_id=$1 AND ($2::int IS NULL OR created_by=$2) AND ($3::uuid IS NULL OR id<$3) ORDER BY id DESC LIMIT 51`,[businessId,req.user.role==='employee' ? req.user.userId : null,req.query.cursor || null])).rows;
    res.json({ payments:rows.slice(0,50).map(publicIntent),nextCursor:rows.length>50 ? rows[49].id : null });
  } catch(error) { fail(error,res,next); }
}
async function cancelIntent(req,res,next) {
  if (!isUuid(req.params.id)) return res.status(400).json({ message:'Mã thanh toán không hợp lệ.' });
  try {
    const businessId=await scope(req);
    await db.transaction(async client => {
      const allowed=(await client.query('SELECT id FROM bank_payment_intents WHERE id=$1 AND business_id=$2 AND ($3::int IS NULL OR created_by=$3)',[req.params.id,businessId,req.user.role==='employee' ? req.user.userId : null])).rows[0];
      if (!allowed) throw failure(404,'Không tìm thấy yêu cầu thanh toán.');
      const intent=await lockIntent(client,allowed.id);
      if (intent.status==='PAID') throw failure(409,'Đã nhận tiền, không thể huỷ yêu cầu.');
      if (intent.status==='CANCELLED') return;
      if (intent.session_id) await client.query('UPDATE cafe_table_sessions SET transaction_id=NULL,quote_token=NULL,quoted_at=NULL,quote_amount=NULL,billed_units=NULL WHERE id=$1 AND closed_at IS NULL AND transaction_id=$2',[intent.session_id,intent.transaction_id]);
      await client.query("UPDATE transactions SET bank_payment_status='EXCEPTION',approval_status='REJECTED',reviewed_by=$1,reviewed_at=now() WHERE id=$2",[req.user.userId,intent.transaction_id]);
      await client.query("UPDATE bank_payment_intents SET status='CANCELLED' WHERE id=$1",[intent.id]);
    });
    res.json({ message:'Đã huỷ yêu cầu. Thao tác này không hoàn tiền ngân hàng và không hoàn kho hàng đã bán.' });
  } catch(error) { fail(error,res,next); }
}
function parsePayload(body) {
  const bank=canonicalBank(body.gateway);
  const match=/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(body.transactionDate || '');
  if (!isPositiveInteger(body.id) || !bank || !/^\d{6,30}$/.test(body.accountNumber || '') || !['in','out'].includes(body.transferType) || !isPositiveInteger(body.transferAmount) || typeof body.content!=='string' || body.content.length>1000 || !match || !isDate(match[1]) || Number(match[2])>23 || Number(match[3])>59 || Number(match[4])>59 || (body.code!=null && (typeof body.code!=='string' || body.code.length>100)) || (body.referenceCode!=null && (typeof body.referenceCode!=='string' || body.referenceCode.length>160))) throw failure(400,'Thông báo giao dịch không hợp lệ.');
  const occurred=new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}+07:00`);
  if (occurred.getTime()>Date.now()+300000) throw failure(400,'Thời gian giao dịch không hợp lệ.');
  const codes=new Set([...body.content.toUpperCase().matchAll(/(?:^|[^A-Z0-9])(CF[0-9A-F]{20})(?=$|[^A-Z0-9])/g)].map(match => match[1]));
  if (/^CF[0-9A-F]{20}$/.test(String(body.code).toUpperCase())) codes.add(body.code.toUpperCase());
  return { provider_id:Number(body.id),bank_code:bank,account_number:body.accountNumber,direction:body.transferType,amount:Number(body.transferAmount),content:body.content,reference_code:body.referenceCode || '',occurred_at:occurred.toISOString(),code:codes.size===1 ? [...codes][0] : null };
}
async function webhook(req,res,next) {
  if (!req.secure || !paymentOrigin()) return res.status(503).json({ success:false });
  if (!isUuid(req.params.id)) return res.status(401).json({ success:false });
  try {
    const connection=(await db.query('SELECT * FROM bank_connections WHERE id=$1 AND enabled',[req.params.id])).rows[0];
    if (!connection || !validSignature(req.body,req.get('X-SePay-Signature'),req.get('X-SePay-Timestamp'),decryptSecret(connection.secret_ciphertext))) return res.status(401).json({ success:false });
    let body; try { body=JSON.parse(req.body.toString('utf8')); } catch { throw failure(400,'JSON không hợp lệ.'); }
    const event=parsePayload(body),hash=createHash('sha256').update(JSON.stringify(event)).digest('hex');
    await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sepay:${connection.id}:${event.provider_id}`]);
      const existing=(await client.query('SELECT payload_hash FROM bank_events WHERE connection_id=$1 AND provider_id=$2',[connection.id,event.provider_id])).rows[0];
      if (existing) { if (existing.payload_hash!==hash) throw failure(409,'Mã giao dịch bị trùng với nội dung khác.'); return; }
      let status=event.direction==='out' ? 'IGNORED_OUT' : 'UNMATCHED',intentId=null;
      if (event.direction==='in' && (event.bank_code!==connection.bank_code || event.account_number!==connection.account_number)) status='WRONG_ACCOUNT';
      else if (event.direction==='in' && event.code) {
        const candidate=(await client.query('SELECT id FROM bank_payment_intents WHERE code=$1 AND connection_id=$2 AND business_id=$3',[event.code,connection.id,connection.business_id])).rows[0];
        if (candidate) { const intent=await lockIntent(client,candidate.id); intentId=intent.id; status=await settleIntent(client,intent,event); }
      }
      await client.query(`INSERT INTO bank_events(business_id,connection_id,provider_id,payload_hash,bank_code,account_number,direction,amount,content,reference_code,occurred_at,status,intent_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[connection.business_id,connection.id,event.provider_id,hash,event.bank_code,event.account_number,event.direction,event.amount,event.content,event.reference_code,event.occurred_at,status,intentId]);
    });
    res.json({ success:true });
  } catch(error) { fail(error,res,next); }
}
async function listEvents(req,res,next) {
  if (req.query.cursor && !isPositiveInteger(req.query.cursor)) return res.status(400).json({ message:'Phân trang không hợp lệ.' });
  try {
    const businessId=await scope(req);
    const rows=(await db.query('SELECT id,amount,content,occurred_at,status,intent_id FROM bank_events WHERE business_id=$1 AND ($2::bigint IS NULL OR id<$2) ORDER BY id DESC LIMIT 51',[businessId,req.query.cursor || null])).rows;
    res.json({ events:rows.slice(0,50),nextCursor:rows.length>50 ? rows[49].id : null });
  } catch(error) { fail(error,res,next); }
}
async function reconcileEvent(req,res,next) {
  if (!isPositiveInteger(req.params.id) || !isUuid(req.body?.intentId)) return res.status(400).json({ message:'Chọn yêu cầu thanh toán cần đối soát.' });
  try {
    const businessId=await scope(req);
    await db.transaction(async client => {
      const allowed=(await client.query('SELECT id FROM bank_payment_intents WHERE id=$1 AND business_id=$2',[req.body.intentId,businessId])).rows[0];
      if (!allowed) throw failure(404,'Không tìm thấy yêu cầu thanh toán.');
      const intent=await lockIntent(client,allowed.id);
      const event=(await client.query('SELECT * FROM bank_events WHERE id=$1 AND business_id=$2 FOR UPDATE',[req.params.id,businessId])).rows[0];
      if (!event) throw failure(404,'Không tìm thấy giao dịch ngân hàng.');
      if (event.connection_id !== intent.connection_id) throw failure(409,'Giao dịch thuộc kết nối ngân hàng khác.');
      if (event.status==='MATCHED') { if (event.intent_id===intent.id) return; throw failure(409,'Giao dịch đã được đối soát cho khoản khác.'); }
      const status=await settleIntent(client,intent,event,true);
      if (status!=='MATCHED') throw failure(409,'Không thể đối soát: phải đúng tài khoản, đúng số tiền và yêu cầu chưa bị huỷ/đã thanh toán.');
      await client.query("UPDATE bank_events SET status='MATCHED',intent_id=$1,reconciled_by=$2 WHERE id=$3",[intent.id,req.user.userId,event.id]);
    });
    res.json({ message:'Đã xác nhận tiền ngân hàng và đối soát.' });
  } catch(error) { fail(error,res,next); }
}
module.exports={ getConnection,saveConnection,getIntent,listIntents,cancelIntent,webhook,listEvents,reconcileEvent };
