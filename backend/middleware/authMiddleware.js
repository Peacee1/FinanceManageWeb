const jwt = require('jsonwebtoken');
const db = require('../config/db');
const {cookieToken,safeOrigin}=require('../utils/webSession');
const protect = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  const cookie=!match?cookieToken(req):null;
  if(cookie&&!['GET','HEAD','OPTIONS'].includes(req.method)&&!safeOrigin(req))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});
  if (!match&&!cookie) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  let decoded;
  try {
    decoded = jwt.verify(match?.[1]||cookie, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(decoded.userId) || decoded.userId < 1) throw new Error('Invalid identity');
  } catch { return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }); }
  try {
    const result = await db.query('SELECT id, role, must_change_password, is_active, family_id, session_version FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user || user.is_active === false || (decoded.sv||0)!==(user.session_version||0)) return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    if (user.must_change_password && req.originalUrl.split('?')[0] !== '/api/auth/change-password') return res.status(403).json({ message: 'Vui lòng đổi mật khẩu trước khi tiếp tục.' });
    req.user = { userId: user.id, role: user.role };
    req.familyMembership = user.family_id ?? null;
    return next();
  } catch (error) { return next(error); }
};
const ownerOnly = (req, res, next) => {
  if (req.user?.role !== 'owner') return res.status(403).json({ message: 'Chỉ chủ quán có quyền thực hiện thao tác này.' });
  return next();
};
module.exports = { protect, ownerOnly };
