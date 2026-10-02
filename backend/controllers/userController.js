const db = require('../config/db');
const { sharedFields, familySettings } = require('../utils/familySettings');

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, plan, phone, email_verified, phone_verified, coin, last_checkin_date, checkin_streak, avatar_url, salary, age, gender, is_goal_initialized, custom_categories, monthly_budgets, bank_saving, investment_income, custom_normal_saving, custom_bank_saving_total, user_goal, qa_pos, budget_settings, separate_personal_wallets, personal_accent, maps_enabled FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    let userProfile = result.rows[0];

    const shared = await familySettings(req.user.userId);
    userProfile.finance_mode = shared ? 'family' : 'personal';
    if (shared) {
      for (const field of sharedFields) userProfile[field] = shared[field] ?? (field === 'monthly_budgets' ? {} : field === 'separate_personal_wallets' ? false : null);
    }
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
const upgradePlan = async (req, res, next) => {
  const { targetPlan } = req.body;
  if (!['plus', 'ultra'].includes(targetPlan)) return res.status(400).json({ message: 'Gói không hợp lệ.' });
  try {
    const result = await db.query(`UPDATE users SET plan = $1, coin = coin - CASE
      WHEN plan = 'normal' AND $1 = 'plus' THEN 1000
      WHEN plan = 'normal' AND $1 = 'ultra' THEN 3500 ELSE 3000 END
      WHERE id = $2 AND ((plan = 'normal' AND $1 = 'plus' AND coin >= 1000)
      OR (plan = 'normal' AND $1 = 'ultra' AND coin >= 3500)
      OR (plan = 'plus' AND $1 = 'ultra' AND coin >= 3000)) RETURNING plan, coin`, [targetPlan, req.user.userId]);
    if (!result.rows.length) return res.status(400).json({ message: 'Không đủ coin hoặc lộ trình nâng cấp không hợp lệ.' });
    res.json({ message: 'Nâng cấp thành công.', ...result.rows[0] });
  } catch (error) { next(error); }
};

const checkIn = async (req, res, next) => {
  try {
    const result = await db.query(`WITH reward AS (
      SELECT id, CASE WHEN last_checkin_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1
        THEN checkin_streak + 1 ELSE 1 END AS streak FROM users
      WHERE id = $1 AND (last_checkin_date IS NULL OR last_checkin_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
      FOR UPDATE
    ), earned AS (
      SELECT id, streak, CASE WHEN streak % 30 = 0 THEN 500 WHEN streak % 7 = 0 THEN 100 ELSE 20 END AS added_coin FROM reward
    ) UPDATE users u SET coin = u.coin + e.added_coin, checkin_streak = e.streak,
      last_checkin_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      FROM earned e WHERE u.id = e.id RETURNING u.coin, e.streak, e.added_coin`, [req.user.userId]);
    if (!result.rows.length) return res.status(400).json({ message: 'Bạn đã điểm danh hôm nay rồi!' });
    const reward = result.rows[0];
    res.json({ message: `Điểm danh thành công! Nhận ${reward.added_coin} coin.`, coin: reward.coin, streak: reward.streak, addedCoin: reward.added_coin });
  } catch (error) { next(error); }
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
const updateCategories = async (req, res, next) => {
  const { categories } = req.body;
  if (!Array.isArray(categories) || categories.length > 100 || categories.some(c => !c || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 100 || !['INCOME', 'EXPENSE'].includes(c.type) || !/^#[0-9a-f]{6}$/i.test(c.color))) return res.status(400).json({ message: 'Danh mục không hợp lệ.' });
  const keys = categories.map(c => `${c.type}:${c.name.trim()}`);
  if (new Set(keys).size !== keys.length) return res.status(400).json({ message: 'Danh mục bị trùng.' });
  try {
    const result = await db.transaction(async client => {
      const membership = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      const user = (await client.query('SELECT coin, custom_categories FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])).rows[0];
      if (membership.family_id) user.custom_categories = (await client.query('SELECT settings FROM families WHERE id=$1 FOR UPDATE', [membership.family_id])).rows[0].settings.custom_categories;
      const defaults = ['EXPENSE:Ăn uống', 'EXPENSE:Mua sắm', 'EXPENSE:Di chuyển', 'EXPENSE:Hoá đơn', 'EXPENSE:Giải trí', 'INCOME:Lương', 'INCOME:Đầu tư', 'INCOME:Khác', 'EXPENSE:Khác'];
      const previous = new Set(user.custom_categories ? user.custom_categories.map(c => `${c.type}:${c.name.trim()}`) : defaults);
      const cost = keys.filter(key => !previous.has(key)).length * 100;
      if (user.coin < cost) return false;
      if (membership.family_id) {
        await client.query('UPDATE users SET coin=coin-$1 WHERE id=$2', [cost, req.user.userId]);
        await client.query("UPDATE families SET settings=jsonb_set(settings,'{custom_categories}',$1::jsonb) WHERE id=$2", [JSON.stringify(categories), membership.family_id]);
      } else await client.query('UPDATE users SET coin = coin - $1, custom_categories = $2 WHERE id = $3', [cost, JSON.stringify(categories), req.user.userId]);
      return true;
    });
    if (!result) return res.status(400).json({ message: 'Không đủ coin để thêm danh mục.' });
    res.json({ message: 'Cập nhật danh mục thành công.' });
  } catch (error) { next(error); }
};

// Cập nhật cài đặt (budgets, goals...)
const updateSettings = async (req, res) => {
  const { monthlyBudgets, bankSaving, investmentIncome, customNormalSaving, customBankSavingTotal, userGoal, qaPos, budgetSettings, separatePersonalWallets, personalAccent } = req.body;
  const { mapsEnabled } = req.body;
  if (mapsEnabled !== undefined && typeof mapsEnabled !== 'boolean') return res.status(400).json({ message: 'Tuỳ chọn bản đồ không hợp lệ.' });
  if (mapsEnabled !== undefined && req.user.role === 'employee') return res.status(403).json({ message: 'Tuỳ chọn bản đồ dành cho sổ Cá nhân và Gia đình.' });
  if (personalAccent !== undefined && !['purple','pink','green','blue','yellow'].includes(personalAccent)) return res.status(400).json({ message: 'Màu giao diện không hợp lệ.' });
  if (personalAccent !== undefined && req.user.role === 'employee') return res.status(403).json({ message: 'Tuỳ chọn màu này dành cho tài khoản cá nhân.' });
  if (separatePersonalWallets !== undefined && typeof separatePersonalWallets !== 'boolean') return res.status(400).json({ message: 'Tuỳ chọn phân biệt tiền phải là bật hoặc tắt.' });
  if (separatePersonalWallets !== undefined && req.user.role === 'employee') return res.status(403).json({ message: 'Tuỳ chọn này chỉ dành cho tài chính cá nhân.' });
  try {
    const fields = [];
    const values = [];
    let count = 1;
    if (mapsEnabled !== undefined) { fields.push(`maps_enabled = $${count++}`); values.push(mapsEnabled); }

    if (personalAccent !== undefined) { fields.push(`personal_accent = $${count++}`); values.push(personalAccent); }
    if (separatePersonalWallets !== undefined) { fields.push(`separate_personal_wallets = $${count++}`); values.push(separatePersonalWallets); }
    if (monthlyBudgets !== undefined) { fields.push(`monthly_budgets = $${count++}`); values.push(JSON.stringify(monthlyBudgets)); }
    if (bankSaving !== undefined) { fields.push(`bank_saving = $${count++}`); values.push(JSON.stringify(bankSaving)); }
    if (investmentIncome !== undefined) { fields.push(`investment_income = $${count++}`); values.push(investmentIncome); }
    if (customNormalSaving !== undefined) { fields.push(`custom_normal_saving = $${count++}`); values.push(customNormalSaving); }
    if (customBankSavingTotal !== undefined) { fields.push(`custom_bank_saving_total = $${count++}`); values.push(customBankSavingTotal); }
    if (userGoal !== undefined) { fields.push(`user_goal = $${count++}`); values.push(JSON.stringify(userGoal)); }
    if (qaPos !== undefined) { fields.push(`qa_pos = $${count++}`); values.push(JSON.stringify(qaPos)); }
    if (budgetSettings !== undefined) { fields.push(`budget_settings = $${count++}`); values.push(JSON.stringify(budgetSettings)); }

    if (fields.length > 0) {
      values.push(req.user.userId);
      await db.transaction(async client => {
        const membership = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR SHARE', [req.user.userId])).rows[0];
        const shared = {};
        const personalFields = [], personalValues = [];
        fields.forEach((field, index) => {
          const column = field.split(' = ')[0];
          if (membership.family_id && sharedFields.includes(column)) {
            shared[column] = ['monthly_budgets','budget_settings','bank_saving','user_goal'].includes(column) ? JSON.parse(values[index]) : values[index];
          } else { personalValues.push(values[index]); personalFields.push(`${column} = $${personalValues.length}`); }
        });
        if (Object.keys(shared).length) await client.query('UPDATE families SET settings=settings || $1::jsonb WHERE id=$2', [JSON.stringify(shared), membership.family_id]);
        if (personalFields.length) {
          personalValues.push(req.user.userId);
          await client.query(`UPDATE users SET ${personalFields.join(', ')} WHERE id=$${personalValues.length}`, personalValues);
        }
      });
    }
    res.json({ message: 'Lưu cài đặt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getProfile, verifyEmail, updatePhone, verifyPhone, upgradePlan, checkIn, updateAvatar, initGoal, updateCategories, updateSettings };
