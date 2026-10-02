const db = require('../config/db');
const { isPositiveInteger } = require('./validation');

async function transactionScope(req) {
  const membership = req.user.role === 'employee' ? null : (await db.query('SELECT family_id FROM users WHERE id=$1', [req.user.userId])).rows[0]?.family_id;
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
  const result = req.user.role === 'employee'
    ? await db.query('SELECT business_id AS id FROM employees WHERE user_id = $1', [req.user.userId])
    : await db.query('SELECT id FROM businesses WHERE owner_id = $1', [req.user.userId]);
  const business = result.rows[0];
  if (!business) return { error: 404, message: 'Không tìm thấy doanh nghiệp.' };
  const requestedId = req.query.businessId || req.body?.businessId;
  if (requestedId !== undefined && (!isPositiveInteger(requestedId) || Number(requestedId) !== business.id)) return { error: 403, message: 'Không có quyền truy cập doanh nghiệp này.' };
  return {
    clause: req.user.role === 'employee' ? 't.business_id = $1 AND t.user_id = $2' : 't.business_id = $1',
    params: req.user.role === 'employee' ? [business.id, req.user.userId] : [business.id],
    businessId: business.id,
  };
}
module.exports = { transactionScope };
