const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  try {
    // Kiểm tra xem email đã tồn tại chưa
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng.' });
    }

    // Hash mật khẩu với bcrypt (Theo chuẩn bảo mật quy định trong file rule)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Lưu vào database
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
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
    // Tìm user bằng email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Tạo JWT token (JSON Web Token)
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET || 'secret_key_tam_thoi', 
      { expiresIn: '1d' }
    );

    res.json({ 
      message: 'Đăng nhập thành công.', 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { register, login };
