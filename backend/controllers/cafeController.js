const { prepareBankPayment, publicIntent } = require('../services/bankPaymentService');
const db = require('../config/db');
const { randomUUID } = require('crypto');
const { vietnamDate } = require('../utils/businessDate');
const { calculateTableFee } = require('../utils/tableBilling');
const { transactionScope } = require('../utils/transactionScope');
const { isPositiveInteger, isDate } = require('../utils/validation');
const failure = (status, message) => Object.assign(new Error(message), { status });
const isCafe = model => typeof model === 'string' && model.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === 'quan cafe';
const columns = 'id, name, is_occupied, version, updated_at, surcharge_enabled, hourly_rate, billing_unit, current_session_id, occupied_since';
const validVersion = version => Number.isSafeInteger(version) && version >= 0 && version < 2147483647;
const validBilling = body => (body.surchargeEnabled === undefined || typeof body.surchargeEnabled === 'boolean') && (body.hourlyRate === undefined || (isPositiveInteger(body.hourlyRate) && Number(body.hourlyRate) <= 1000000000)) && (body.billingUnit === undefined || ['MINUTE', 'HOUR'].includes(body.billingUnit));

async function context(req, cafeOnly = false) {
  const scope = await transactionScope({ ...req, query: { ...req.query, scope: 'business' } });
  if (scope.error) throw failure(scope.error, scope.message);
  const business = (await db.query('SELECT id, name, model FROM businesses WHERE id = $1', [scope.businessId])).rows[0];
  if (!business) throw failure(404, 'Không tìm thấy doanh nghiệp.');
  if (cafeOnly && !isCafe(business.model)) throw failure(403, 'Quản lý bàn chỉ dành cho quán cafe.');
  return business;
}
function respondError(error, res, next) {
  if (error.code === '23505') return res.status(409).json({ message: 'Tên bàn đã tồn tại trong quán.' });
  if (error.status) return res.status(error.status).json({ message: error.message });
  next(error);
}
async function getContext(req, res, next) {
  try { res.json({ business: await context(req) }); } catch (error) { respondError(error, res, next); }
}
async function listTables(req, res, next) {
  try {
    const business = await context(req, true);
    const tables = await db.query(`SELECT ${columns} FROM cafe_tables WHERE business_id = $1 AND deleted_at IS NULL ORDER BY id`, [business.id]);
    res.json({ tables: tables.rows });
  } catch (error) { respondError(error, res, next); }
}
async function createTable(req, res, next) {
  const name = typeof req.body.name === 'string' ? req.body.name.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (!validBilling(req.body) || !name || name.length > 50 || /[\x00-\x1f\x7f]/.test(name)) return res.status(400).json({ message: 'Tên bàn phải có từ 1 đến 50 ký tự.' });
  try {
    const business = await context(req, true);
    const table = await db.transaction(async client => {
      // Serialize creation per business so the bounded list cannot grow through concurrent requests.
      await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [business.id]);
      const count = (await client.query('SELECT count(*) FROM cafe_tables WHERE business_id = $1 AND deleted_at IS NULL', [business.id])).rows[0].count;
      if (Number(count) >= 500) throw failure(409, 'Quán đã đạt giới hạn 500 bàn.');
      return (await client.query(`INSERT INTO cafe_tables(business_id,name,updated_by,surcharge_enabled,hourly_rate,billing_unit) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${columns}`, [business.id, name, req.user.userId, req.body.surchargeEnabled ?? false, req.body.hourlyRate ?? 5000, req.body.billingUnit ?? 'HOUR'])).rows[0];
    });
    res.status(201).json({ table });
  } catch (error) { respondError(error, res, next); }
}
async function setOccupancy(req, res, next) {
  const { isOccupied, version } = req.body;
  if (!isPositiveInteger(req.params.id) || typeof isOccupied !== 'boolean' || !Number.isSafeInteger(version) || version < 0 || version > 2147483646) return res.status(400).json({ message: 'Trạng thái bàn không hợp lệ.' });
  try {
    const business = await context(req, true);
    const table = await db.transaction(async client => {
      const current = (await client.query(`SELECT ${columns} FROM cafe_tables WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL FOR UPDATE`, [req.params.id, business.id])).rows[0];
      if (!current) throw failure(404, 'Không tìm thấy bàn trong quán.');
      if (current.is_occupied === isOccupied) return current;
      if (current.version !== version) throw failure(409, 'Trạng thái bàn vừa được người khác cập nhật. Vui lòng kiểm tra lại.');
      if (!isOccupied && current.current_session_id) throw failure(409, 'Bàn có phụ thu. Vui lòng thanh toán trước khi đóng bàn.');
      let sessionId = null;
      if (isOccupied && current.surcharge_enabled) {
        sessionId = randomUUID();
        await client.query('INSERT INTO cafe_table_sessions(id,table_id,business_id,table_name,hourly_rate,billing_unit) VALUES ($1,$2,$3,$4,$5,$6)', [sessionId, current.id, business.id, current.name, current.hourly_rate, current.billing_unit]);
      }
      return (await client.query(`UPDATE cafe_tables SET is_occupied=$1, current_session_id=$4, version=version+1, updated_by=$2, updated_at=now() WHERE id=$3 RETURNING ${columns}`, [isOccupied, req.user.userId, current.id, sessionId])).rows[0];
    });
    res.json({ table });
  } catch (error) { respondError(error, res, next); }
}
async function editTable(req, res, next) {
  const deleting = req.method === 'DELETE';
  const { version } = req.body;
  const name = typeof req.body.name === 'string' ? req.body.name.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (!validBilling(req.body) || !isPositiveInteger(req.params.id) || !Number.isSafeInteger(version) || version < 0 || version > 2147483646 || (!deleting && (!name || name.length > 50 || /[\x00-\x1f\x7f]/.test(name)))) return res.status(400).json({ message: 'Tên bàn hoặc phiên bản không hợp lệ.' });
  try {
    const business = await context(req, true);
    const table = await db.transaction(async client => {
      const current = (await client.query(`SELECT ${columns} FROM cafe_tables WHERE id=$1 AND business_id=$2 AND deleted_at IS NULL FOR UPDATE`, [req.params.id, business.id])).rows[0];
      if (!current) throw failure(404, 'Không tìm thấy bàn trong quán.');
      if (current.version !== version) throw failure(409, 'Bàn vừa được cập nhật. Vui lòng kiểm tra lại trước khi sửa hoặc xoá.');
      if (deleting) {
        if (current.current_session_id) throw failure(409, 'Phải thanh toán phụ thu trước khi xoá bàn.');
        await client.query('UPDATE cafe_tables SET deleted_at=now(), version=version+1 WHERE id=$1', [current.id]);
        return current;
      }
      return (await client.query(`UPDATE cafe_tables SET name=$1, surcharge_enabled=$4, hourly_rate=$5, billing_unit=$6, version=version+1, updated_by=$2, updated_at=now() WHERE id=$3 RETURNING ${columns}`, [name, req.user.userId, current.id, req.body.surchargeEnabled ?? current.surcharge_enabled, req.body.hourlyRate ?? current.hourly_rate, req.body.billingUnit ?? current.billing_unit])).rows[0];
    });
    res.json(deleting ? { deletedId: table.id } : { table });
  } catch (error) { respondError(error, res, next); }
}
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function quoteTable(req, res, next) {
  if (!isPositiveInteger(req.params.id) || !validVersion(req.body.version)) return res.status(400).json({ message: 'Bàn không hợp lệ.' });
  try {
    const business = await context(req, true);
    const quote = await db.transaction(async client => {
      const table = (await client.query('SELECT * FROM cafe_tables WHERE id=$1 AND business_id=$2 AND deleted_at IS NULL FOR UPDATE', [req.params.id, business.id])).rows[0];
      if (!table) throw failure(404, 'Không tìm thấy bàn.');
      if (table.version !== req.body.version || !table.current_session_id) throw failure(409, 'Phiên sử dụng bàn đã thay đổi. Vui lòng tải lại.');
      const session = (await client.query('SELECT *, clock_timestamp() AS ended_at FROM cafe_table_sessions WHERE id=$1 FOR UPDATE', [table.current_session_id])).rows[0];
      if (session.transaction_id) {
        const pending = (await client.query("SELECT * FROM bank_payment_intents WHERE transaction_id=$1 AND status='WAITING'", [session.transaction_id])).rows[0];
        if (pending) return { sessionId: session.id, quoteToken: session.quote_token, amount: Number(session.quote_amount), startedAt: session.started_at, endedAt: session.quoted_at, units: session.billed_units, billingUnit: session.billing_unit, hourlyRate: Number(session.hourly_rate), tableId: table.id, tableName: table.name, bankPayment: publicIntent(pending) };
      }
      const fee = calculateTableFee(session.started_at, session.ended_at, session.hourly_rate, session.billing_unit);
      const token = randomUUID();
      await client.query('UPDATE cafe_table_sessions SET quote_token=$1, quoted_at=$2, quote_amount=$3, billed_units=$4 WHERE id=$5', [token, session.ended_at, fee.amount, fee.units, session.id]);
      return { sessionId: session.id, quoteToken: token, amount: fee.amount, units: fee.units, billingUnit: session.billing_unit, hourlyRate: Number(session.hourly_rate), startedAt: session.started_at, endedAt: session.ended_at, tableId: table.id, tableName: table.name, expiresAt: new Date(new Date(session.ended_at).getTime() + 120000) };
    });
    res.json({ quote });
  } catch (error) { respondError(error, res, next); }
}
async function payTable(req, res, next) {
  const { sessionId, quoteToken, paymentMethod } = req.body;
  if (!isPositiveInteger(req.params.id) || !isUuid(sessionId) || !isUuid(quoteToken) || !['CASH', 'TRANSFER'].includes(paymentMethod)) return res.status(400).json({ message: 'Chọn tiền mặt hoặc chuyển khoản và bảng phí hợp lệ.' });
  try {
    const business = await context(req, true);
    const result = await db.transaction(async client => {
      const table = (await client.query(`SELECT ${columns} FROM cafe_tables WHERE id=$1 AND business_id=$2 AND deleted_at IS NULL FOR UPDATE`, [req.params.id, business.id])).rows[0];
      if (!table) throw failure(404, 'Không tìm thấy bàn.');
      const session = (await client.query('SELECT *, clock_timestamp() AS current_time FROM cafe_table_sessions WHERE id=$1 AND table_id=$2 AND business_id=$3 FOR UPDATE', [sessionId, table.id, business.id])).rows[0];
      if (!session || session.quote_token !== quoteToken) throw failure(409, 'Bảng phí đã thay đổi. Vui lòng lấy lại bảng phí.');
      if (session.closed_at) {
        if (session.payment_method !== paymentMethod) throw failure(409, 'Phiên bàn đã thanh toán bằng hình thức khác.');
        return { table, amount: Number(session.quote_amount), replayed: true };
      }
      if (session.transaction_id) {
        const pending = (await client.query("SELECT * FROM bank_payment_intents WHERE transaction_id=$1 AND status='WAITING'", [session.transaction_id])).rows[0];
        if (pending) {
          if (paymentMethod !== 'TRANSFER') throw failure(409, 'Hãy huỷ yêu cầu chuyển khoản trước khi đổi sang tiền mặt.');
          return { table, amount: Number(session.quote_amount), bankPayment: publicIntent(pending), replayed: true };
        }
      }
      if (table.current_session_id !== session.id || new Date(session.current_time) - new Date(session.quoted_at) > 120000) throw failure(409, 'Bảng phí đã hết hạn hoặc phiên bàn đã thay đổi. Vui lòng lấy lại bảng phí.');
      const description = `Phụ thu bàn ${session.table_name}: ${session.billed_units} ${session.billing_unit === 'HOUR' ? 'giờ' : 'phút'}, ${session.hourly_rate}đ/giờ`;
      const transaction = (await client.query("INSERT INTO transactions(user_id,business_id,type,amount,category,date,description,payment_method) VALUES ($1,$2,'INCOME',$3,'Phụ thu bàn',$4,$5,$6) RETURNING *", [req.user.userId, business.id, session.quote_amount, vietnamDate(), description, paymentMethod])).rows[0];
      const bankPayment = await prepareBankPayment(client, transaction, session);
      if (bankPayment) {
        await client.query('UPDATE cafe_table_sessions SET transaction_id=$1 WHERE id=$2', [transaction.id, session.id]);
        return { table, amount: Number(session.quote_amount), bankPayment, replayed: false };
      }
      await client.query('UPDATE cafe_table_sessions SET closed_at=quoted_at, transaction_id=$1, paid_by=$2, payment_method=$3 WHERE id=$4', [transaction.id, req.user.userId, paymentMethod, session.id]);
      const closed = (await client.query(`UPDATE cafe_tables SET is_occupied=false,current_session_id=NULL,version=version+1,updated_at=now(),updated_by=$1 WHERE id=$2 RETURNING ${columns}`, [req.user.userId, table.id])).rows[0];
      return { table: closed, amount: Number(session.quote_amount), replayed: false };
    });
    res.json(result);
  } catch (error) { respondError(error, res, next); }
}
async function tableHistory(req,res,next) {
  const day = req.query.date || vietnamDate();
  if (!isPositiveInteger(req.params.id) || !isDate(day) || (req.query.cursor && !isPositiveInteger(req.query.cursor))) return res.status(400).json({ message: 'Ngày hoặc bàn không hợp lệ.' });
  try {
    const business = await context(req,true);
    const table = (await db.query(`SELECT ${columns} FROM cafe_tables WHERE id=$1 AND business_id=$2 AND deleted_at IS NULL`,[req.params.id,business.id])).rows[0];
    if (!table) throw failure(404,'Không tìm thấy bàn trong quán.');
    const rows = (await db.query(`SELECT id,started_at,closed_at,start_estimated FROM cafe_occupancy_history WHERE business_id=$1 AND table_id=$2
      AND started_at < (($3::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AND (closed_at IS NULL OR closed_at > ($3::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))
      AND ($4::bigint IS NULL OR id<$4) ORDER BY id DESC LIMIT 51`,[business.id,table.id,day,req.query.cursor || null])).rows;
    const history = rows.slice(0,50);
    res.json({ table,date:day,history,nextCursor:rows.length>50 ? history.at(-1).id : null });
  } catch (error) { respondError(error,res,next); }
}
module.exports = { getContext, listTables, createTable, setOccupancy, editTable, quoteTable, payTable, tableHistory };
