const db = require('../config/db');

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, plan, phone, email_verified, phone_verified, coin, last_checkin_date, checkin_streak, avatar_url, salary, age, gender, is_goal_initialized, custom_categories, monthly_budgets, bank_saving, investment_income, custom_normal_saving, custom_bank_saving_total, user_goal, qa_pos FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    let userProfile = result.rows[0];
    if (!userProfile.custom_categories) {
      userProfile.custom_categories = [
        { name: 'Ăn uống', type: 'EXPENSE', color: '#FB7185' },
        { name: 'Mua sắm', type: 'EXPENSE', color: '#F472B6' },
        { name: 'Di chuyển', type: 'EXPENSE', color: '#FBBF24' },
        { name: 'Hoá đơn', type: 'EXPENSE', color: '#34D399' },
        { name: 'Giải trí', type: 'EXPENSE', color: '#67E8F9' },
        { name: 'Lương', type: 'INCOME', color: '#34D399' },
        { name: 'Đầu tư', type: 'INCOME', color: '#7C3AED' },
        { name: 'Khác', type: 'INCOME', color: '#9CA3AF' },
        { name: 'Khác', type: 'EXPENSE', color: '#9CA3AF' }
      ];
    }
    res.json(userProfile);
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

    let addedCoin = 20;
    if (newStreak > 0 && newStreak % 30 === 0) addedCoin = 500;
    else if (newStreak > 0 && newStreak % 7 === 0) addedCoin = 100;

    const newCoin = user.coin + addedCoin;

    await db.query('UPDATE users SET coin = $1, last_checkin_date = $2, checkin_streak = $3 WHERE id = $4', [newCoin, todayStr, newStreak, req.user.userId]);

    res.json({ message: `Điểm danh thành công! Nhận ${addedCoin} coin.`, coin: newCoin, streak: newStreak, addedCoin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật avatar
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn một file ảnh' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.userId]);
    res.json({ message: 'Cập nhật ảnh đại diện thành công', avatar_url: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Lưu form khởi tạo mục tiêu
const initGoal = async (req, res) => {
  const { salary, age, gender } = req.body;
  try {
    await db.query('UPDATE users SET salary = $1, age = $2, gender = $3, is_goal_initialized = true WHERE id = $4', [salary, age, gender, req.user.userId]);
    res.json({ message: 'Lưu thông tin thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật danh mục
const updateCategories = async (req, res) => {
  const { categories } = req.body;
  try {
    await db.query('UPDATE users SET custom_categories = $1 WHERE id = $2', [JSON.stringify(categories), req.user.userId]);
    res.json({ message: 'Cập nhật danh mục thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật cài đặt (budgets, goals...)
const updateSettings = async (req, res) => {
  const { monthlyBudgets, bankSaving, investmentIncome, customNormalSaving, customBankSavingTotal, userGoal, qaPos } = req.body;
  try {
    const fields = [];
    const values = [];
    let count = 1;

    if (monthlyBudgets !== undefined) { fields.push(`monthly_budgets = $${count++}`); values.push(JSON.stringify(monthlyBudgets)); }
    if (bankSaving !== undefined) { fields.push(`bank_saving = $${count++}`); values.push(JSON.stringify(bankSaving)); }
    if (investmentIncome !== undefined) { fields.push(`investment_income = $${count++}`); values.push(investmentIncome); }
    if (customNormalSaving !== undefined) { fields.push(`custom_normal_saving = $${count++}`); values.push(customNormalSaving); }
    if (customBankSavingTotal !== undefined) { fields.push(`custom_bank_saving_total = $${count++}`); values.push(customBankSavingTotal); }
    if (userGoal !== undefined) { fields.push(`user_goal = $${count++}`); values.push(JSON.stringify(userGoal)); }
    if (qaPos !== undefined) { fields.push(`qa_pos = $${count++}`); values.push(JSON.stringify(qaPos)); }

    if (fields.length > 0) {
      values.push(req.user.userId);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${count}`;
      await db.query(query, values);
    }
    res.json({ message: 'Lưu cài đặt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan, checkIn, updateAvatar, initGoal, updateCategories, updateSettings };
