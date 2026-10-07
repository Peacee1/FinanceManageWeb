const db = require('../config/db');
const validId = value => /^[1-9][0-9]{0,18}$/.test(String(value)) && BigInt(value) <= 9223372036854775807n;
const listNotifications = async (req, res, next) => {
  const before = req.query.before;
  if (before !== undefined && !validId(before)) return res.status(400).json({ message: 'Trang thông báo không hợp lệ.' });
  try {
    const result = await db.transaction(async client => {
      const unread = (await client.query('SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL', [req.user.userId])).rows[0].count;
      const rows = (await client.query('SELECT id,kind,title,message,target,created_at,read_at FROM notifications WHERE user_id=$1 AND ($2::bigint IS NULL OR id<$2) ORDER BY id DESC LIMIT 30', [req.user.userId,before || null])).rows;
      return { items: rows, unread, nextCursor: rows.length === 30 ? rows.at(-1).id : null };
    });
    res.json(result);
  } catch (error) { next(error); }
};
const markRead = async (req, res, next) => {
  const { id, all } = req.body || {};
  if (all !== true && (typeof id !== 'string' && typeof id !== 'number' || !validId(id))) return res.status(400).json({ message: 'Thông báo không hợp lệ.' });
  try {
    const result = await db.query('UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE user_id=$1 AND ($2::boolean OR id=$3::bigint) RETURNING id', [req.user.userId,all === true,all === true ? null : id]);
    if (all !== true && !result.rows.length) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    res.json({ message: 'Đã đánh dấu đã đọc.' });
  } catch (error) { next(error); }
};
module.exports = { listNotifications, markRead };
