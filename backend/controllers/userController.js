const db = require('../config/db');

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, plan, phone, email_verified, phone_verified, coin FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Xác thực email (Mô phỏng)
const verifyEmail = async (req, res) => {
  try {
    await db.query('UPDATE users SET email_verified = true WHERE id = $1', [req.user.userId]);
    res.json({ message: 'Xác thực email thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật số điện thoại
const updatePhone = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Vui lòng nhập số điện thoại' });
  
  try {
    await db.query('UPDATE users SET phone = $1, phone_verified = false WHERE id = $2', [phone, req.user.userId]);
    res.json({ message: 'Đã thêm số điện thoại' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Xác thực SĐT (Mô phỏng)
const verifyPhone = async (req, res) => {
  try {
    await db.query('UPDATE users SET phone_verified = true WHERE id = $1', [req.user.userId]);
    res.json({ message: 'Xác thực SĐT thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Nâng cấp gói
const upgradePlan = async (req, res) => {
  const { targetPlan } = req.body; // 'plus' or 'ultra'
  
  try {
    // 1. Lấy thông tin user hiện tại
    const result = await db.query('SELECT plan, coin FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];
    
    let cost = 0;
    if (user.plan === 'normal' && targetPlan === 'plus') cost = 1000;
    else if (user.plan === 'normal' && targetPlan === 'ultra') cost = 3500;
    else if (user.plan === 'plus' && targetPlan === 'ultra') cost = 3000;
    else {
      return res.status(400).json({ message: 'Không thể nâng cấp theo lộ trình này.' });
    }

    if (user.coin < cost) {
      return res.status(400).json({ message: 'Không đủ coin để nâng cấp.' });
    }

    // 2. Trừ coin và cập nhật plan
    await db.query('UPDATE users SET plan = $1, coin = coin - $2 WHERE id = $3', [targetPlan, cost, req.user.userId]);
    
    res.json({ message: `Nâng cấp lên gói ${targetPlan.toUpperCase()} thành công! Đã trừ ${cost} coin.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan };
