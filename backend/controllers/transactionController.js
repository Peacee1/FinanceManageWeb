const db = require('../config/db');
const { transactionError, isPositiveInteger } = require('../utils/validation');
const { transactionScope } = require('../utils/transactionScope');
const { vietnamDate } = require('../utils/businessDate');

const getTransactions = async (req, res, next) => {
  const { month, year, limit, offset } = req.query;
  if ((month !== undefined || year !== undefined) && (!isPositiveInteger(month) || Number(month) > 12 || !isPositiveInteger(year) || Number(year) < 1900 || Number(year) > 9998)) return res.status(400).json({ message: 'Tháng/năm không hợp lệ.' });
  if ((limit !== undefined && (!isPositiveInteger(limit) || Number(limit) > 500)) || (offset !== undefined && (!/^\d+$/.test(String(offset)) || !Number.isSafeInteger(Number(offset))))) return res.status(400).json({ message: 'Phân trang không hợp lệ.' });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const params = [...scope.params];
    let query = `SELECT t.* FROM transactions t WHERE ${scope.clause}`;
    if (month !== undefined) {
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
      query += ` AND t.date >= $${params.length}::date AND t.date < ($${params.length}::date + interval '1 month')`;
    }
    query += ' ORDER BY t.date DESC, t.id DESC';
    if (limit !== undefined) { params.push(Number(limit)); query += ` LIMIT $${params.length}`; }
    if (offset !== undefined) { params.push(Number(offset)); query += ` OFFSET $${params.length}`; }
    res.json((await db.query(query, params)).rows);
  } catch (error) { next(error); }
};

const getSummary = async (req, res, next) => {
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const result = await db.query(`SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), 0) AS today_expense,
      COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) AS month_income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS month_expense
      FROM transactions t WHERE ${scope.clause}
      AND date >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      AND date < (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month')::date`, scope.params);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};

const addTransaction = async (req, res, next) => {
  if (req.user.role === 'employee' && !['CASH', 'TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Vui lòng chọn tiền mặt hoặc chuyển khoản.' });
  if (req.body.paymentMethod !== undefined && !['CASH', 'TRANSFER'].includes(req.body.paymentMethod)) return res.status(400).json({ message: 'Hình thức thanh toán không hợp lệ.' });
  const validationError = transactionError(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const { type, amount, category, date, description } = req.body;
    const saleDate = req.user.role === 'employee' ? vietnamDate() : date;
    const result = await db.query('INSERT INTO transactions (user_id, business_id, type, amount, category, date, description, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [req.user.userId, scope.businessId, type, amount, category, saleDate, description || '', req.body.paymentMethod || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
};

const deleteTransaction = async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const params = [...scope.params, req.params.id];
    const result = await db.query(`DELETE FROM transactions t WHERE ${scope.clause} AND t.sale_request_id IS NULL AND t.id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền xóa.' });
    res.json({ message: 'Xóa giao dịch thành công.', transaction: result.rows[0] });
  } catch (error) { next(error); }
};

const updateTransaction = async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã giao dịch không hợp lệ.' });
  const validationError = transactionError(req.body, true);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const scope = await transactionScope(req);
    if (scope.error) return res.status(scope.error).json({ message: scope.message });
    const fields = ['type', 'amount', 'category', 'date', 'description'].filter(field => req.body[field] !== undefined);
    if (!fields.length) return res.status(400).json({ message: 'Chưa có nội dung cập nhật.' });
    const params = [...scope.params];
    const updates = fields.map(field => { params.push(req.body[field]); return `${field} = $${params.length}`; });
    params.push(req.params.id);
    const result = await db.query(`UPDATE transactions t SET ${updates.join(', ')} WHERE ${scope.clause} AND t.sale_request_id IS NULL AND t.id = $${params.length} RETURNING *`, params);
    if (!result.rows.length) return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền sửa.' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
};
module.exports = { getTransactions, getSummary, addTransaction, deleteTransaction, updateTransaction };
