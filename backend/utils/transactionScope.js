const db = require('../config/db');

async function transactionScope(req) {
  const membership = req.user.role === 'employee' ? null : Object.hasOwn(req,'familyMembership') ? req.familyMembership : (await db.query('SELECT family_id FROM users WHERE id=$1', [req.user.userId])).rows[0]?.family_id;
  const scope = req.query.scope || req.body?.scope || (req.user.role === 'employee' ? 'business' : membership ? 'family' : 'personal');
  if (!['personal', 'family', 'business'].includes(scope)) return { error: 400, message: 'Phạm vi giao dịch không hợp lệ.' };
  if (scope === 'family') {
    if (!membership) return { error: 403, message: 'Bạn chưa tham gia Gia đình.' };
    return { clause: 't.family_id = $1 AND t.business_id IS NULL', params: [membership], businessId: null, familyId: membership };
  }
  if (scope === 'personal') {
    if (membership) return { error: 403, message: 'Tài khoản Gia đình không thể sử dụng sổ Cá nhân.' };
    if (req.user.role === 'employee') return { error: 403, message: 'Tài khoản nhân viên chỉ truy cập giao dịch bán hàng.' };
    return { clause: 't.user_id = $1 AND t.business_id IS NULL AND t.family_id IS NULL', params: [req.user.userId], businessId: null };
  }
  return { error: 410, message: 'Business module has been retired.' };
}
module.exports = { transactionScope };
