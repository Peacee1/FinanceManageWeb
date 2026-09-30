const jwt = require('jsonwebtoken');
const db = require('../config/db');
const protect = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(decoded.userId) || decoded.userId < 1) throw new Error('Invalid identity');
  } catch { return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }); }
  try {
    const result = await db.query('SELECT id, role, must_change_password FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    if (user.must_change_password && req.originalUrl.split('?')[0] !== '/api/auth/change-password') return res.status(403).json({ message: 'Vui lòng đổi mật khẩu trước khi tiếp tục.' });
    req.user = { userId: user.id, role: user.role };
    return next();
  } catch (error) { return next(error); }
};
const ownerOnly = (req, res, next) => {
  if (req.user?.role !== 'owner') return res.status(403).json({ message: 'Chỉ chủ quán có quyền thực hiện thao tác này.' });
  return next();
};
module.exports = { protect, ownerOnly };
