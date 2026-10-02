const { prepareBankPayment } = require('../services/bankPaymentService');
const db = require('../config/db');
const { transactionError, isPositiveInteger, isDate } = require('../utils/validation');
const { transactionScope } = require('../utils/transactionScope');
const { vietnamDate } = require('../utils/businessDate');
const { createHash } = require('crypto');
const { createReadStream } = require('fs');
const { publicTransactionColumns, publicTransaction } = require('../utils/transactionProjection');
const { removeEvidence } = require('../services/evidenceService');
const { familySettings } = require('../utils/familySettings');

const getTransactions = async (req, res, next) => {
  const { month, year, limit, offset } = req.query;
  if (req.query.date !== undefined && !isDate(req.query.date)) return res.status(400).json({ message: 'Ngày không hợp lệ.' });
  const cursor = req.query.cursor ? /^([0-9]{4}-[0-9]{2}-[0-9]{2}):([0-9]+)$/.exec(req.query.cursor) : null;
  if (req.query.cursor && (!cursor || !isDate(cursor[1]) || !isPositiveInteger(cursor[2]))) return res.status(400).json({ message: 'Con trỏ trang không hợp lệ.' });
  if ((month !== undefined || year !== undefined) && (!isPositiveInteger(month) || Number(month) > 12 || !isPositiveInteger(year) || Number(year) < 1900 || Number(year) > 9998)) return res.status(400).json({ message: 'Tháng/năm không hợp lệ.' });
  if ((limit !== undefined && (!isPositiveInteger(limit) || Number(limit) > 500)) || (offset !== undefined && (!/^\d+$/.test(String(offset)) || !Number.isSafeInteger(Number(offset))))) return res.status(400).json({ message: 'Phân trang không hợp lệ.' });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const params = [...scope.params];
    let query = `SELECT ${publicTransactionColumns} FROM transactions t WHERE ${scope.clause}`;
    if (req.query.approvalStatus !== undefined && !['PENDING','APPROVED','REJECTED','ALL'].includes(req.query.approvalStatus)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    const status = req.query.approvalStatus || (req.user.role === 'employee' ? 'ALL' : 'APPROVED');
    if (status !== 'ALL') { params.push(status); query += ` AND t.approval_status=$${params.length}`; }
    if (status === 'APPROVED') query += " AND t.bank_payment_status IN ('MANUAL','VERIFIED')";
    if (req.query.date) { params.push(req.query.date); query += ` AND t.date=$${params.length}::date`; }
    if (month !== undefined) {
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
      query += ` AND t.date >= $${params.length}::date AND t.date < ($${params.length}::date + interval '1 month')`;
    }
    if (cursor) { params.push(cursor[1], Number(cursor[2])); query += ` AND (t.date, t.id) < ($${params.length - 1}::date, $${params.length}::int)`; }
    query += ' ORDER BY t.date DESC, t.id DESC';
    if (limit !== undefined) { params.push(Number(limit)); query += ` LIMIT $${params.length}`; }
    if (offset !== undefined) { params.push(Number(offset)); query += ` OFFSET $${params.length}`; }
    const rows = (await db.query(query, params)).rows;
    if (limit && rows.length === Number(limit)) { const last = rows.at(-1); res.setHeader('X-Next-Cursor', `${new Date(last.date).toISOString().slice(0, 10)}:${last.id}`); }
    res.json(rows);
  } catch (error) { next(error); }
};

const getSummary = async (req, res, next) => {
  const { month, year } = req.query;
  if ((month !== undefined || year !== undefined) && (!isPositiveInteger(month) || Number(month) > 12 || !isPositiveInteger(year) || Number(year) < 1900 || Number(year) > 9998)) return res.status(400).json({ message: 'Tháng/năm không hợp lệ.' });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const params = [...scope.params];
    params.push(month ? `${year}-${String(month).padStart(2, '0')}-01` : null);
    const period = `$${params.length}::date`;
    let result;
    if (scope.businessId !== null) {
      result = await db.query(`SELECT
        COALESCE(SUM(income) FILTER (WHERE date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_income,
        COALESCE(SUM(expense) FILTER (WHERE date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_expense,
        COALESCE(SUM(income), 0) AS month_income,
        COALESCE(SUM(expense), 0) AS month_expense
        FROM business_daily_totals t WHERE ${scope.clause}
        AND date >= COALESCE(${period}, date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
        AND date < (COALESCE(${period}, date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) + interval '1 month')::date`, params);
    } else {
      result = await db.query(`SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_expense,
      COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) AS month_income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS month_expense
      FROM transactions t WHERE ${scope.clause}
      AND date >= COALESCE(${period}, date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
      AND date < (COALESCE(${period}, date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) + interval '1 month')::date`, params);
    }
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};

const addTransaction = async (req, res, next) => {
  req.body ||= {};
  if (req.user.role === 'employee' && (typeof req.body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.requestId))) return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
  if (req.user.role === 'employee' && !['CASH', 'TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Vui lòng chọn tiền mặt hoặc chuyển khoản.' });
  if (req.body.paymentMethod !== undefined && !['CASH', 'TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Hình thức thanh toán không hợp lệ.' });
  const validationError = transactionError(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    if (scope.businessId === null) {
      const settings = scope.familyId ? await familySettings(req.user.userId) : (await db.query('SELECT separate_personal_wallets FROM users WHERE id=$1', [req.user.userId])).rows[0];
      if (settings?.separate_personal_wallets && !['CASH','TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Vui lòng chọn tiền mặt hoặc tiền tài khoản.' });
    }
    const { type, amount, category, date, description } = req.body;
    const saleDate = req.user.role === 'employee' ? vietnamDate() : date;
    let imageHash = null;
    if (req.file) {
      const digest = createHash('sha256');
      for await (const chunk of createReadStream(req.file.path)) digest.update(chunk);
      imageHash = digest.digest('hex');
    }
    const fingerprint = createHash('sha256').update(JSON.stringify({ type, amount: Number(amount), category, date, description: description || '', paymentMethod: req.body.paymentMethod || null, imageHash, businessId: scope.businessId })).digest('hex');
    const result = await db.transaction(async client => {
      if (req.user.role === 'employee') {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`submission:${req.user.userId}:${req.body.requestId}`]);
        const previous = (await client.query('SELECT * FROM transactions WHERE user_id=$1 AND submission_request_id=$2', [req.user.userId,req.body.requestId])).rows[0];
        if (previous) {
          if (previous.submission_request_hash !== fingerprint) return { conflict: true };
          return { row: previous, bankPayment: await prepareBankPayment(client, previous), replayed: true };
        }
      }
      const row = (await client.query(`INSERT INTO transactions(user_id,business_id,type,amount,category,date,description,payment_method,submission_request_id,submission_request_hash,evidence_filename,evidence_mime,evidence_expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,(SELECT expires_at FROM transaction_evidence_files WHERE filename=$11)) RETURNING *`, [req.user.userId,scope.businessId,type,amount,category,saleDate,description || '',req.body.paymentMethod || null,req.user.role === 'employee' ? req.body.requestId : null,fingerprint,req.file?.filename || null,req.file?.mimetype || null])).rows[0];
      return { row, bankPayment: await prepareBankPayment(client, row), replayed: false };
    });
    if (result.conflict) return res.status(409).json({ message: 'Mã yêu cầu đã được dùng cho khoản thu chi khác.' });
    req.evidencePersisted = Boolean(req.file && !result.replayed);
    res.status(result.replayed ? 200 : 201).json({ ...publicTransaction(result.row), bankPayment: result.bankPayment });
  } catch (error) { next(error); }
};

const deleteTransaction = async (req, res, next) => {
  if (req.user.role === 'employee') return res.status(403).json({ message: 'Nhân viên không được xoá khoản thu chi đã gửi.' });
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const params = [...scope.params, req.params.id];
    const result = await db.query(`DELETE FROM transactions t WHERE ${scope.clause} AND t.sale_request_id IS NULL AND t.bank_payment_status='MANUAL' AND t.id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền xóa.' });
    if (result.rows[0].evidence_filename) await removeEvidence(result.rows[0].evidence_filename);
    res.json({ message: 'Xóa giao dịch thành công.', transaction: publicTransaction(result.rows[0]) });
  } catch (error) { next(error); }
};

const updateTransaction = async (req, res, next) => {
  if (req.user.role === 'employee') return res.status(403).json({ message: 'Nhân viên không được sửa khoản thu chi đã gửi.' });
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
  if (req.body.paymentMethod !== undefined && !['CASH','TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Nguồn tiền không hợp lệ.' });
  const validationError = transactionError(req.body, true);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    if (scope.businessId === null) {
      const current = (await db.query(`SELECT t.payment_method FROM transactions t WHERE ${scope.clause} AND t.id=$${scope.params.length + 1}`, [...scope.params, req.params.id])).rows[0];
      const settings = scope.familyId ? await familySettings(req.user.userId) : (await db.query('SELECT separate_personal_wallets FROM users WHERE id=$1', [req.user.userId])).rows[0];
      if (current) current.separate_personal_wallets = settings?.separate_personal_wallets;
      if (current?.separate_personal_wallets && !['CASH','TRANSFER'].includes(req.body.paymentMethod ?? current.payment_method)) return res.status(400).json({ message: 'Vui lòng chọn tiền mặt hoặc tiền tài khoản cho giao dịch này.' });
    }
    const fields = ['type', 'amount', 'category', 'date', 'description', ...(scope.businessId === null ? ['paymentMethod'] : [])].filter(field => req.body[field] !== undefined);
    if (!fields.length) return res.status(400).json({ message: 'Chưa có nội dung cập nhật.' });
    const params = [...scope.params];
    const updates = fields.map(field => { params.push(req.body[field]); return `${field === 'paymentMethod' ? 'payment_method' : field} = $${params.length}`; });
    params.push(req.params.id);
    const result = await db.query(`UPDATE transactions t SET ${updates.join(', ')} WHERE ${scope.clause} AND t.sale_request_id IS NULL AND t.bank_payment_status='MANUAL' AND t.id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền sửa.' });
    res.json(publicTransaction(result.rows[0]));
  } catch (error) { next(error); }
};
module.exports = { getTransactions, getSummary, addTransaction, deleteTransaction, updateTransaction };
