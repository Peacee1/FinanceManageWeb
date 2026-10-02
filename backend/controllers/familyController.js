const db = require('../config/db');
const { randomBytes } = require('crypto');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const getFamily = async (req, res, next) => {
  try {
    const family = (await db.query('SELECT f.id,f.name,f.invite_code,f.member_capacity,f.creator_id FROM families f JOIN users u ON u.family_id=f.id WHERE u.id=$1', [req.user.userId])).rows[0];
    const pending = (await db.query('SELECT n.id,n.event_type,f.name FROM family_dissolution_notices n JOIN families f ON f.id=n.family_id WHERE n.user_id=$1 AND n.resolved_at IS NULL ORDER BY n.id', [req.user.userId])).rows;
    if (!family) return res.json({ mode: 'personal', family: null, pending });
    family.members = (await db.query('SELECT id,name FROM users WHERE family_id=$1 ORDER BY family_slot', [family.id])).rows;
    family.is_creator = family.creator_id === req.user.userId;
    res.json({ mode: 'family', family, pending });
  } catch (error) { next(error); }
};
const changeFamily = action => async (req, res, next) => {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Nhân viên không thể tham gia Gia đình.' });
  if (req.body?.syncPersonal !== undefined && typeof req.body.syncPersonal !== 'boolean') return res.status(400).json({ message: 'Lựa chọn đồng bộ không hợp lệ.' });
  try {
    await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(732620)');
      const user = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      if (user.family_id) fail(409, 'Bạn đã sử dụng chế độ Gia đình.');
      if ((await client.query('SELECT 1 FROM family_dissolution_notices WHERE user_id=$1 AND resolved_at IS NULL', [req.user.userId])).rows.length) fail(409, 'Vui lòng chọn đồng bộ sau giải tán trước khi tham gia Gia đình mới.');
      if (action === 'create') {
        const name = req.body?.name;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) fail(400, 'Tên gia đình cần từ 1 đến 100 ký tự.');
        const family = (await client.query('INSERT INTO families(name,invite_code,creator_id) VALUES($1,$2,$3) RETURNING id', [name.trim(), randomBytes(24).toString('hex'), req.user.userId])).rows[0];
        await client.query('UPDATE users SET family_id=$1,family_slot=1 WHERE id=$2', [family.id, req.user.userId]);
      } else {
        const code = req.body?.inviteCode;
        if (typeof code !== 'string' || !/^[a-f0-9]{48}$/.test(code.trim())) fail(400, 'Mã mời không hợp lệ.');
        const family = (await client.query('SELECT id,member_capacity FROM families WHERE invite_code=$1 AND dissolved_at IS NULL FOR UPDATE', [code.trim()])).rows[0];
        if (!family) fail(404, 'Không tìm thấy gia đình với mã mời này.');
        const members = (await client.query('SELECT family_slot FROM users WHERE family_id=$1', [family.id])).rows;
        if (members.length >= family.member_capacity) fail(409, `Gia đình đã có đủ ${family.member_capacity} tài khoản. Mua thêm slot để mời người mới.`);
        const used = new Set(members.map(member => member.family_slot));
        let slot = 1;
        while (used.has(slot)) slot++;
        await client.query('UPDATE users SET family_id=$1,family_slot=$2 WHERE id=$3', [family.id, slot, req.user.userId]);
      }
      if (req.body.syncPersonal === true) await client.query(`INSERT INTO transactions(user_id,type,amount,category,date,description,payment_method,location,sync_source_id)
        SELECT user_id,type,amount,category,date,description,payment_method,location,id FROM transactions
        WHERE user_id=$1 AND family_id IS NULL AND business_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM transactions f WHERE f.sync_source_id=transactions.id AND f.family_id=(SELECT family_id FROM users WHERE id=$1))`, [req.user.userId]);
    });
    return getFamily(req, res, next);
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
const dissolveFamily = async (req, res, next) => {
  try {
    await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(732620)');
      const familyId = (await client.query('SELECT family_id FROM users WHERE id=$1', [req.user.userId])).rows[0]?.family_id;
      if (!familyId) fail(409, 'Bạn chưa tham gia Gia đình hoặc gia đình đã giải tán.');
      const members = (await client.query('SELECT id FROM users WHERE family_id=$1 ORDER BY id FOR UPDATE', [familyId])).rows;
      const family = (await client.query('SELECT creator_id,name FROM families WHERE id=$1 FOR UPDATE', [familyId])).rows[0];
      if (family.creator_id !== req.user.userId) fail(403, 'Chỉ người tạo Gia đình mới có thể giải tán.');
      const actor = (await client.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
      for (const member of members) await client.query(`INSERT INTO notifications(user_id,kind,title,message,target,event_key)
        VALUES($1,'family_dissolved','Gia đình đã bị giải tán',$2,'family',$3) ON CONFLICT(user_id,event_key) DO NOTHING`, [member.id, `${actor.name} đã giải tán Gia đình “${family.name}”. Bạn có thể chọn đồng bộ dữ liệu về lịch Cá nhân.`, `family-dissolved:${familyId}`]);
      for (const member of members) await client.query("INSERT INTO family_dissolution_notices(user_id,family_id) VALUES($1,$2) ON CONFLICT(user_id,family_id) DO UPDATE SET resolved_at=NULL,sync_data=NULL,event_type='dissolved'", [member.id, familyId]);
      await client.query('UPDATE families SET dissolved_at=now() WHERE id=$1', [familyId]);
      await client.query('UPDATE users SET family_id=NULL,family_slot=NULL WHERE family_id=$1', [familyId]);
    });
    res.json({ message: 'Gia đình đã được giải tán.' });
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
const resolveDissolution = async (req, res, next) => {
  if (!Number.isSafeInteger(req.body?.noticeId) || typeof req.body?.syncData !== 'boolean') return res.status(400).json({ message: 'Lựa chọn đồng bộ không hợp lệ.' });
  try {
    await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(732620)');
      const user = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      const notice = (await client.query('SELECT * FROM family_dissolution_notices WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.body.noticeId, req.user.userId])).rows[0];
      if (!notice) fail(404, 'Không tìm thấy thông báo.');
      if (notice.resolved_at) return;
      if (user.family_id) fail(409, 'Bạn cần ở chế độ Cá nhân để đồng bộ.');
      if (req.body.syncData) await client.query(`INSERT INTO transactions(user_id,type,amount,category,date,description,payment_method,location,sync_source_id)
        SELECT user_id,type,amount,category,date,description,payment_method,location,id FROM transactions
        WHERE family_id=$1 AND user_id=$2 AND business_id IS NULL AND sync_source_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM transactions p WHERE p.sync_source_id=transactions.id AND p.family_id IS NULL)`, [notice.family_id, req.user.userId]);
      await client.query('UPDATE family_dissolution_notices SET resolved_at=now(),sync_data=$1 WHERE id=$2', [req.body.syncData, notice.id]);
    });
    res.json({ message: 'Đã lưu lựa chọn đồng bộ.' });
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
const buySlot = async (req, res, next) => {
  const requestId = req.body?.requestId;
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return res.status(400).json({ message: 'Mã yêu cầu mua slot không hợp lệ.' });
  try {
    const result = await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(732620)');
      const user = (await client.query('SELECT family_id,coin FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      if (!user?.family_id) fail(403, 'Bạn cần tham gia Gia đình để mua slot.');
      const family = (await client.query('SELECT member_capacity FROM families WHERE id=$1 AND dissolved_at IS NULL FOR UPDATE', [user.family_id])).rows[0];
      if (!family) fail(409, 'Gia đình đã bị giải tán.');
      const previous = (await client.query('SELECT family_id FROM family_slot_purchases WHERE user_id=$1 AND request_id=$2', [req.user.userId,requestId])).rows[0];
      if (previous) {
        if (previous.family_id !== user.family_id) fail(409, 'Mã yêu cầu đã dùng cho Gia đình khác.');
        return { coin: user.coin, member_capacity: family.member_capacity };
      }
      if (user.coin < 1500) fail(400, 'Bạn cần ít nhất 1.500 xu để mua thêm một slot.');
      await client.query('INSERT INTO family_slot_purchases(user_id,family_id,request_id) VALUES($1,$2,$3)', [req.user.userId,user.family_id,requestId]);
      const updated = (await client.query('UPDATE users SET coin=coin-1500 WHERE id=$1 RETURNING coin', [req.user.userId])).rows[0];
      const capacity = (await client.query('UPDATE families SET member_capacity=member_capacity+1 WHERE id=$1 RETURNING member_capacity', [user.family_id])).rows[0];
      return { ...updated, ...capacity };
    });
    res.json({ message: 'Đã mua thêm một slot Gia đình với 1.500 xu.', ...result });
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
const leaveFamily = async (req, res, next) => {
  try {
    await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(732620)');
      const user = (await client.query('SELECT family_id FROM users WHERE id=$1 FOR UPDATE', [req.user.userId])).rows[0];
      if (!user?.family_id) fail(409, 'Bạn chưa tham gia Gia đình.');
      const family = (await client.query('SELECT creator_id FROM families WHERE id=$1 FOR UPDATE', [user.family_id])).rows[0];
      if (family.creator_id === req.user.userId) fail(403, 'Người tạo cần giải tán Gia đình thay vì rời.');
      await client.query("INSERT INTO family_dissolution_notices(user_id,family_id,event_type) VALUES($1,$2,'left') ON CONFLICT(user_id,family_id) DO UPDATE SET resolved_at=NULL,sync_data=NULL,event_type='left'", [req.user.userId,user.family_id]);
      await client.query('UPDATE users SET family_id=NULL,family_slot=NULL WHERE id=$1', [req.user.userId]);
    });
    res.json({ message: 'Bạn đã rời Gia đình.' });
  } catch (error) { if (error.status) return res.status(error.status).json({ message: error.message }); next(error); }
};
module.exports = { getFamily, createFamily: changeFamily('create'), joinFamily: changeFamily('join'), dissolveFamily, resolveDissolution, buySlot, leaveFamily };
