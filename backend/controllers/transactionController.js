const db = require('../config/db');

// Lấy danh sách giao dịch của user
const getTransactions = async (req, res) => {
  const userId = req.user.userId;
  const { month, year } = req.query; // Tùy chọn lọc theo tháng/năm

  try {
    let query = 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC';
    let params = [userId];

    if (month && year) {
      query = `SELECT * FROM transactions WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3 ORDER BY date DESC`;
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

module.exports = { getTransactions, addTransaction };
