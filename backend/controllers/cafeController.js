const db = require('../config/db');
const { transactionScope } = require('../utils/transactionScope');
const { isPositiveInteger } = require('../utils/validation');
const failure = (status, message) => Object.assign(new Error(message), { status });
const isCafe = model => typeof model === 'string' && model.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === 'quan cafe';
const columns = 'id, name, is_occupied, version, updated_at';

async function context(req, cafeOnly = false) {
  const scope = await transactionScope({ ...req, query: { ...req.query, scope: 'business' } });
  if (scope.error) throw failure(scope.error, scope.message);
  const business = (await db.query('SELECT id, name, model FROM businesses WHERE id = $1', [scope.businessId])).rows[0];
  if (!business) throw failure(404, 'Không tìm thấy doanh nghiệp.');
  if (cafeOnly && !isCafe(business.model)) throw failure(403, 'Quản lý bàn chỉ dành cho quán cafe.');
  return business;
}
function respondError(error, res, next) {
  if (error.code === '23505') return res.status(409).json({ message: 'Tên bàn đã tồn tại trong quán.' });
  if (error.status) return res.status(error.status).json({ message: error.message });
  next(error);
}
async function getContext(req, res, next) {
  try { res.json({ business: await context(req) }); } catch (error) { respondError(error, res, next); }
}
async function listTables(req, res, next) {
  try {
    const business = await context(req, true);
    const tables = await db.query(`SELECT ${columns} FROM cafe_tables WHERE business_id = $1 ORDER BY id`, [business.id]);
    res.json({ tables: tables.rows });
  } catch (error) { respondError(error, res, next); }
}
async function createTable(req, res, next) {
  const name = typeof req.body.name === 'string' ? req.body.name.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 50 || /[\x00-\x1f\x7f]/.test(name)) return res.status(400).json({ message: 'Tên bàn phải có từ 1 đến 50 ký tự.' });
  try {
    const business = await context(req, true);
    const table = await db.transaction(async client => {
      // Serialize creation per business so the bounded list cannot grow through concurrent requests.
      await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [business.id]);
      const count = (await client.query('SELECT count(*) FROM cafe_tables WHERE business_id = $1', [business.id])).rows[0].count;
      if (Number(count) >= 500) throw failure(409, 'Quán đã đạt giới hạn 500 bàn.');
      return (await client.query(`INSERT INTO cafe_tables(business_id,name,updated_by) VALUES ($1,$2,$3) RETURNING ${columns}`, [business.id, name, req.user.userId])).rows[0];
    });
    res.status(201).json({ table });
  } catch (error) { respondError(error, res, next); }
}
async function setOccupancy(req, res, next) {
  const { isOccupied, version } = req.body;
  if (!isPositiveInteger(req.params.id) || typeof isOccupied !== 'boolean' || !Number.isSafeInteger(version) || version < 0 || version > 2147483646) return res.status(400).json({ message: 'Trạng thái bàn không hợp lệ.' });
  try {
    const business = await context(req, true);
    const table = await db.transaction(async client => {
      const current = (await client.query(`SELECT ${columns} FROM cafe_tables WHERE id = $1 AND business_id = $2 FOR UPDATE`, [req.params.id, business.id])).rows[0];
      if (!current) throw failure(404, 'Không tìm thấy bàn trong quán.');
      if (current.is_occupied === isOccupied) return current;
      if (current.version !== version) throw failure(409, 'Trạng thái bàn vừa được người khác cập nhật. Vui lòng kiểm tra lại.');
      return (await client.query(`UPDATE cafe_tables SET is_occupied=$1, version=version+1, updated_by=$2, updated_at=now() WHERE id=$3 RETURNING ${columns}`, [isOccupied, req.user.userId, current.id])).rows[0];
    });
    res.json({ table });
  } catch (error) { respondError(error, res, next); }
}
module.exports = { getContext, listTables, createTable, setOccupancy };
