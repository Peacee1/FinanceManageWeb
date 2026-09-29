const db = require('../config/db');

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, plan, phone, email_verified, phone_verified, coin, last_checkin_date, checkin_streak FROM users WHERE id = $1', [req.user.userId]);
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

// Điểm danh nhận coin
const checkIn = async (req, res) => {
  try {
    const result = await db.query('SELECT last_checkin_date, checkin_streak, coin FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];
    
    // Convert to VN timezone offset effectively
    const today = new Date();
    today.setHours(today.getHours() + 7);
    const todayStr = today.toISOString().split('T')[0];

    const lastCheckinDate = user.last_checkin_date ? new Date(user.last_checkin_date) : null;
    let lastCheckinStr = null;
    if (lastCheckinDate) {
       lastCheckinDate.setHours(lastCheckinDate.getHours() + 7);
       lastCheckinStr = lastCheckinDate.toISOString().split('T')[0];
    }

    if (lastCheckinStr === todayStr) {
      return res.status(400).json({ message: 'Bạn đã điểm danh hôm nay rồi!' });
    }

    let newStreak = 1;
    if (lastCheckinStr) {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() + 7);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastCheckinStr === yesterdayStr) {
        newStreak = user.checkin_streak + 1;
      }
    }

    const newCoin = user.coin + 20;

    await db.query('UPDATE users SET coin = $1, last_checkin_date = $2, checkin_streak = $3 WHERE id = $4', [newCoin, todayStr, newStreak, req.user.userId]);

    res.json({ message: 'Điểm danh thành công! Nhận 20 coin.', coin: newCoin, streak: newStreak });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan, checkIn };
