const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const validatePassword = (pwd) => {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

  if (pwd.length < minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return false;
  }
  return true;
};

const register = async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  // Validate server-side cho an toàn tuyệt đối
  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Mật khẩu không đạt yêu cầu bảo mật.' });
  }

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Luôn luôn tạo tài khoản là 'normal'
    const plan = 'normal';

    // Lưu vào database
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, plan) VALUES ($1, $2, $3, $4) RETURNING id, name, email, plan',
      [name, email, passwordHash, plan]
    );

    res.status(201).json({ message: 'Đăng ký thành công.', user: result.rows[0] });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET || 'secret_key_tam_thoi', 
      { expiresIn: '1d' }
    );

    // Trả về kèm thông tin plan
    res.json({ 
      message: 'Đăng nhập thành công.', 
      token, 
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan } 
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { register, login };
