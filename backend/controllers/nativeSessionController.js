const {refreshNativeSession,revokeNativeSession,createNativeSession} = require('../services/nativeSessionService');
const db = require('../config/db');
exports.upgrade = async (req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const user=(await db.query('SELECT id,session_version FROM users WHERE id=$1',[req.user.userId])).rows[0];
    res.json({refreshToken:await createNativeSession(user)});
  } catch(error) { next(error); }
};
exports.refresh = async (req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const session = await refreshNativeSession(req.body?.refreshToken);
    if (!session) return res.status(401).json({message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'});
    res.json(session);
  } catch(error) { next(error); }
};
exports.logout = async (req,res,next) => {
  res.setHeader('Cache-Control','no-store');
  try { await revokeNativeSession(req.body?.refreshToken);res.sendStatus(204); } catch(error) { next(error); }
};
