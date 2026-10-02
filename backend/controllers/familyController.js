const db = require('../config/db');
const { randomBytes } = require('crypto');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const getFamily = async (req, res, next) => {
  try {
    const family = (await db.query('SELECT f.id,f.name,f.invite_code FROM families f JOIN users u ON u.family_id=f.id WHERE u.id=$1', [req.user.userId])).rows[0];
    if (!family) return res.json({ mode: 'personal', family: null });
    family.members = (await db.query('SELECT id,name FROM users WHERE family_id=$1 ORDER BY family_slot', [family.id])).rows;
    res.json({ mode: 'family', family });
  } catch (error) { next(error); }
};
const changeFamily = action => async (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Nhân viên không thể tham gia Gia đình.' });
  try {
    await db.transaction(async client => {
      const user = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      if (user.family_id) fail(409, 'Bạn đã sử dụng chế độ Gia đình.');
      if (action === 'create') {
        const name = req.body?.name;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) fail(400, 'Tên gia đình cần từ 1 đến 100 ký tự.');
        const family = (await client.query('INSERT INTO families(name,invite_code) VALUES($1,$2) RETURNING id', [name.trim(), randomBytes(24).toString('hex')])).rows[0];
        await client.query('UPDATE users SET family_id=$1,family_slot=1 WHERE id=$2', [family.id, req.user.userId]);
      } else {
        const code = req.body?.inviteCode;
        if (typeof code !== 'string' || !/^[a-f0-9]{48}$/.test(code.trim())) fail(400, 'Mã mời không hợp lệ.');
        const family = (await client.query('SELECT id FROM families WHERE invite_code=$1 FOR UPDATE', [code.trim()])).rows[0];
        if (!family) fail(404, 'Không tìm thấy gia đình với mã mời này.');
        const members = (await client.query('SELECT family_slot FROM users WHERE family_id=$1', [family.id])).rows;
        if (members.length >= 2) fail(409, 'Gia đình đã có đủ 2 tài khoản.');
        const slot = members.some(member => member.family_slot === 1) ? 2 : 1;
        await client.query('UPDATE users SET family_id=$1,family_slot=$2 WHERE id=$3', [family.id, slot, req.user.userId]);
      }
    });
    return getFamily(req, res, next);
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
module.exports = { getFamily, createFamily: changeFamily('create'), joinFamily: changeFamily('join') };
