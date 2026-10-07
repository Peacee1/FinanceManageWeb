const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const {safeOrigin,setSession}=require('../utils/webSession');

const { isPassword: validatePassword } = require('../utils/validation');

const register = async (req, res) => {
  const { email, password, name } = req.body;
  
  if (typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof name !== 'string' || !name.trim() || name.length > 100 || typeof password !== 'string') {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  // Validate server-side cho an toàn tuyệt đối
  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Mật khẩu không đạt yêu cầu bảo mật.' });
  }

  try {
    const normalizedEmail=email.trim().toLowerCase();
    const userCheck = await db.query('SELECT * FROM users WHERE lower(email) = $1', [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Luôn luôn tạo tài khoản là 'normal'
    const plan = 'normal';

    // Lưu vào database
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, plan, require_email_verification) VALUES ($1, $2, $3, $4, false) RETURNING id, name, email, plan',
      [name.trim(), normalizedEmail, passwordHash, plan]
    );

    res.status(201).json({ message: 'Đã tạo tài khoản. Bạn có thể đăng nhập ngay.', verificationRequired:false, user: result.rows[0] });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const login = async (req, res) => {
  const { email, password, loginType } = req.body;
  
  if (typeof email !== 'string' || !email || email.length > 255 || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Vui long nhap day du thong tin.' });
  }

  try {
    let result;
    if (loginType === 'employee') {
      // Nhân viên đăng nhập bằng username
      result = await db.query('SELECT * FROM users WHERE username = $1 AND role = $2', [email, 'employee']);
    } else {
      // Chủ quán đăng nhập bằng email
      result = await db.query('SELECT * FROM users WHERE lower(email) = $1', [email.trim().toLowerCase()]);
    }
    const user = result.rows[0];

    if (!user || user.is_active === false) {
      return res.status(401).json({ message: 'Thong tin dang nhap khong dung.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Thong tin dang nhap khong dung.' });
    }


    // Embed role vào token để middleware phân biệt
    const token = jwt.sign(
      { userId: user.id, role: user.role || 'owner',sv:user.session_version||0 }, 
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    if(safeOrigin(req))setSession(res,token);
    res.json({ 
      message: 'Dang nhap thanh cong.', 
      token, 
      user: { 
        id: user.id, name: user.name, email: user.email, 
        plan: user.plan, role: user.role || 'owner',
        mustChangePassword: user.must_change_password || false
      } 
    });
  } catch (error) {
    console.error('Loi khi dang nhap:', error);
    res.status(500).json({ message: 'Loi server.' });
  }
};

// POST /api/auth/change-password — Nhân viên đổi mật khẩu lần đầu
const changePassword = async (req, res) => {
  const userId = req.user.userId;
  const { newPassword } = req.body;
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ message: 'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [hash, userId]);
    res.json({ message: 'Doi mat khau thanh cong.' });
  } catch (error) {
    console.error('Loi doi mat khau:', error);
    res.status(500).json({ message: 'Loi server.' });
  }
};

module.exports = { register, login, changePassword };
