const db = require('../config/db');

// Lấy danh sách giao dịch của user
const getTransactions = async (req, res) => {
  const userId = req.user.userId;
  const { month, year } = req.query; // Tùy chọn lọc theo tháng/năm

  try {
    let query = `
      SELECT t.* 
      FROM transactions t
      WHERE t.user_id = $1 
         OR t.user_id IN (
           SELECT e.user_id 
           FROM employees e 
           JOIN businesses b ON e.business_id = b.id 
           WHERE b.owner_id = $1 AND e.user_id IS NOT NULL
         )
      ORDER BY t.date DESC
    `;
    let params = [userId];

    if (month && year) {
      query = `
        SELECT t.* 
        FROM transactions t
        WHERE (t.user_id = $1 
           OR t.user_id IN (
             SELECT e.user_id 
             FROM employees e 
             JOIN businesses b ON e.business_id = b.id 
             WHERE b.owner_id = $1 AND e.user_id IS NOT NULL
           ))
          AND EXTRACT(MONTH FROM t.date) = $2 
          AND EXTRACT(YEAR FROM t.date) = $3 
        ORDER BY t.date DESC
      `;
      params = [userId, month, year];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Lỗi khi lấy giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu giao dịch' });
  }
};

// Thêm giao dịch mới
const addTransaction = async (req, res) => {
  const userId = req.user.userId;
  const { type, amount, category, date, description } = req.body;

  if (!type || !amount || !category || !date) {
    return res.status(400).json({ message: 'Vui lòng điền đủ thông tin giao dịch' });
  }

  if (type !== 'INCOME' && type !== 'EXPENSE') {
    return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
  }

  try {
    const result = await db.query(
      'INSERT INTO transactions (user_id, type, amount, category, date, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, type, amount, category, date, description || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi thêm giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server khi thêm giao dịch' });
  }
};

// Xoá giao dịch
const deleteTransaction = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền xoá' });
    }
    res.json({ message: 'Xoá giao dịch thành công', transaction: result.rows[0] });
  } catch (error) {
    console.error('Lỗi khi xoá giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server khi xoá giao dịch' });
  }
};

// Cập nhật giao dịch
const updateTransaction = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { type, amount, category, date, description } = req.body;

  try {
    const result = await db.query(
      'UPDATE transactions SET type = COALESCE($1, type), amount = COALESCE($2, amount), category = COALESCE($3, category), date = COALESCE($4, date), description = COALESCE($5, description) WHERE id = $6 AND user_id = $7 RETURNING *',
      [type, amount, category, date, description, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền sửa' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lỗi khi sửa giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server khi sửa giao dịch' });
  }
};

module.exports = { getTransactions, addTransaction, deleteTransaction, updateTransaction };
