const db = require('../config/db');
const { createHash } = require('crypto');
const { isPositiveInteger, isDate } = require('../utils/validation');
const { transactionScope } = require('../utils/transactionScope');
const { vietnamDate } = require('../utils/businessDate');
const { recalculateStock } = require('../services/inventoryService');

const isRequestId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const error = (status, message) => Object.assign(new Error(message), { status });
async function businessScope(req) {
  const scope = await transactionScope({ ...req, query: { ...req.query, scope: 'business' } });
  if (scope.error) throw error(scope.error, scope.message);
  return scope.businessId;
}
function fail(res, next, failure) {
  if (failure.status) return res.status(failure.status).json({ message: failure.message });
  return next(failure);
}

const listInventory = async (req, res, next) => {
  try {
    const businessId = await businessScope(req);
    const products = await db.query('SELECT id, name, price, avatar_url, stock_quantity, track_stock FROM products WHERE business_id = $1 AND archived_at IS NULL ORDER BY name, id', [businessId]);
    res.json({ products: products.rows });
  } catch (failure) { fail(res, next, failure); }
};

const listMovements = async (req, res, next) => {
  const offset = Number(req.query.offset || 0);
  const cursor = req.query.cursor ? /^([0-9]{4}-[0-9]{2}-[0-9]{2}):([0-9]+)$/.exec(req.query.cursor) : null;
  if (req.query.cursor && (!cursor || !isDate(cursor[1]) || !isPositiveInteger(cursor[2]))) return res.status(400).json({ message: 'Con trỏ trang không hợp lệ.' });
  if (!Number.isSafeInteger(offset) || offset < 0 || (req.query.type && !['IN', 'OUT'].includes(req.query.type))) return res.status(400).json({ message: 'Bộ lọc không hợp lệ.' });
  try {
    const businessId = await businessScope(req);
    const result = await db.query(`SELECT m.*
      FROM stock_movements m
      WHERE m.business_id = $1 AND m.deleted_at IS NULL AND ($2::text IS NULL OR m.type = $2) AND ($4::date IS NULL OR (m.movement_date, m.id) < ($4::date, $5::int))
      ORDER BY m.movement_date DESC, m.id DESC LIMIT 51 OFFSET $3`, [businessId, req.query.type || null, offset, cursor?.[1] || null, cursor ? Number(cursor[2]) : null]);
    const visible = result.rows.slice(0, 50);
    const last = visible.at(-1);
    res.json({ movements: visible, hasMore: result.rows.length > 50, nextCursor: result.rows.length > 50 ? `${new Date(last.movement_date).toISOString().slice(0, 10)}:${last.id}` : null });
  } catch (failure) { fail(res, next, failure); }
};

const moveStock = async (req, res, next) => {
  const { productId, quantity, type, note = '', requestId } = req.body;
  if (!isRequestId(requestId)) return res.status(400).json({ message: 'Mã yêu cầu phiếu kho không hợp lệ.' });
  const fingerprint = createHash('sha256').update(JSON.stringify({ productId: Number(productId), quantity: Number(quantity), type, note })).digest('hex');
  if (!isPositiveInteger(productId) || !isPositiveInteger(quantity) || Number(quantity) > 1000000 || !['IN', 'OUT'].includes(type) || typeof note !== 'string' || note.length > 500) return res.status(400).json({ message: 'Chọn hàng hóa, loại phiếu và số lượng nguyên dương (tối đa 1.000.000).' });
  try {
    const businessId = await businessScope(req);
    let replayed = false;
    const movement = await db.transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`stock:${businessId}:${requestId}`]);
      const existing = (await client.query('SELECT * FROM stock_movements WHERE business_id = $1 AND request_id = $2', [businessId, requestId])).rows[0];
      if (existing) {
        if (existing.actor_id !== req.user.userId || existing.request_hash !== fingerprint || existing.deleted_at) throw error(409, 'Mã phiếu đã được sử dụng.');
        replayed = true; return existing;
      }
      const product = (await client.query('SELECT * FROM products WHERE id = $1 AND business_id = $2 AND archived_at IS NULL FOR UPDATE', [productId, businessId])).rows[0];
      if (!product) throw error(404, 'Không tìm thấy hàng hóa trong doanh nghiệp.');
      if (type === 'OUT' && (!product.track_stock || product.stock_quantity < Number(quantity))) throw error(409, 'Không đủ tồn kho để xuất. Hãy nhập kho trước.');
      const stockAfter = product.stock_quantity + (type === 'IN' ? Number(quantity) : -Number(quantity));
      if (stockAfter > 2147483647) throw error(400, 'Số lượng tồn vượt giới hạn.');
      await client.query('UPDATE products SET stock_quantity = $1, track_stock = true WHERE id = $2', [stockAfter, product.id]);
      return (await client.query('INSERT INTO stock_movements(business_id, product_id, actor_id, type, quantity, stock_after, reason, note, actor_name, product_name, request_id, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(SELECT name FROM users WHERE id = $3),$9,$10,$11) RETURNING *', [businessId, product.id, req.user.userId, type, quantity, stockAfter, type === 'IN' ? 'RECEIPT' : 'MANUAL', note.trim(), product.name, requestId, fingerprint])).rows[0];
    });
    res.status(replayed ? 200 : 201).json({ message: type === 'IN' ? 'Nhập kho thành công.' : 'Xuất kho thành công.', movement });
  } catch (failure) { fail(res, next, failure); }
};

const checkout = async (req, res, next) => {
  const { items, requestId, paymentMethod, expectedTotal } = req.body;
  if (!['CASH', 'TRANSFER'].includes(paymentMethod)) return res.status(400).json({ message: 'Vui lòng chọn tiền mặt hoặc chuyển khoản.' });
  if (!isRequestId(requestId) || !Array.isArray(items) || !items.length || items.length > 100 || items.some(item => !item || !isPositiveInteger(item.productId) || !isPositiveInteger(item.quantity) || Number(item.quantity) > 1000000)) return res.status(400).json({ message: 'Giỏ hàng không hợp lệ.' });
  const normalized = items.map(item => ({ productId: Number(item.productId), quantity: Number(item.quantity) })).sort((a, b) => a.productId - b.productId);
  if (new Set(normalized.map(item => item.productId)).size !== normalized.length) return res.status(400).json({ message: 'Hàng hóa trong giỏ bị trùng.' });
  const fingerprint = createHash('sha256').update(JSON.stringify({ items: normalized, paymentMethod })).digest('hex');
  try {
    const businessId = await businessScope(req);
    const result = await db.transaction(async client => {
      // Serialize retries, then lock products in a stable order to avoid overselling.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`sale:${businessId}:${requestId}`]);
      const existing = (await client.query('SELECT * FROM transactions WHERE business_id = $1 AND sale_request_id = $2', [businessId, requestId])).rows[0];
      if (existing) {
        if (existing.user_id !== req.user.userId || existing.sale_request_hash !== fingerprint) throw error(409, 'Mã đơn đã được sử dụng cho một giỏ hàng khác.');
        return { transaction: existing, replayed: true };
      }
      const products = (await client.query('SELECT * FROM products WHERE business_id = $1 AND id = ANY($2::int[]) AND archived_at IS NULL ORDER BY id FOR UPDATE', [businessId, normalized.map(item => item.productId)])).rows;
      if (products.length !== normalized.length) throw error(404, 'Một hàng hóa không còn tồn tại trong doanh nghiệp.');
      let total = 0;
      for (let i = 0; i < products.length; i++) {
        const product = products[i], item = normalized[i];
        if (product.track_stock && product.stock_quantity < item.quantity) throw error(409, `${product.name}: tồn kho chỉ còn ${product.stock_quantity}.`);
        total += Number(product.price) * item.quantity;
        if (!Number.isSafeInteger(total) || total <= 0) throw error(400, 'Giá trị đơn hàng không hợp lệ.');
      }
      if (expectedTotal !== undefined && (!isPositiveInteger(expectedTotal) || Number(expectedTotal) !== total)) throw error(409, 'Giá sản phẩm đã thay đổi. Vui lòng tải lại giỏ hàng và xác nhận số tiền.');
      const description = products.map((product, i) => `${product.name} x${normalized[i].quantity}`).join(', ');
      const transaction = (await client.query("INSERT INTO transactions(user_id,business_id,type,amount,category,date,description,sale_request_id,sale_request_hash,payment_method) VALUES ($1,$2,'INCOME',$3,'Ban hang',$4,$5,$6,$7,$8) RETURNING *", [req.user.userId, businessId, total, vietnamDate(), description, requestId, fingerprint, paymentMethod])).rows[0];
      for (let i = 0; i < products.length; i++) {
        const product = products[i], item = normalized[i];
        await client.query('INSERT INTO sale_items(transaction_id,product_id,product_name,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)', [transaction.id, product.id, product.name, item.quantity, product.price]);
        if (product.track_stock) {
          const stockAfter = product.stock_quantity - item.quantity;
          await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [stockAfter, product.id]);
          await client.query("INSERT INTO stock_movements(business_id,product_id,actor_id,type,quantity,stock_after,reason,transaction_id,actor_name,product_name) VALUES ($1,$2,$3,'OUT',$4,$5,'SALE',$6,(SELECT name FROM users WHERE id = $3),$7)", [businessId, product.id, req.user.userId, item.quantity, stockAfter, transaction.id, product.name]);
        }
      }
      return { transaction, replayed: false };
    });
    res.status(result.replayed ? 200 : 201).json({ message: 'Thanh toán thành công.', ...result });
  } catch (failure) { fail(res, next, failure); }
};

async function changeMovement(req, res, next, remove) {
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã phiếu không hợp lệ.' });
  const { type, quantity, note = '', date } = req.body || {};
  if (!remove && (!['IN', 'OUT'].includes(type) || !isPositiveInteger(quantity) || Number(quantity) > 1000000 || typeof note !== 'string' || note.length > 500 || !isDate(date) || date > vietnamDate())) return res.status(400).json({ message: 'Ngày, số lượng hoặc nội dung phiếu không hợp lệ.' });
  try {
    const businessId = await businessScope(req);
    const stockQuantity = await db.transaction(async client => {
      const selected = (await client.query(`SELECT m.id, m.product_id, p.archived_at FROM stock_movements m
        JOIN products p ON p.id = m.product_id WHERE m.id = $1 AND m.business_id = $2 AND m.deleted_at IS NULL FOR UPDATE OF p`, [req.params.id, businessId])).rows[0];
      if (!selected) throw error(404, 'Không tìm thấy phiếu kho.');
      const live = (await client.query('SELECT id FROM stock_movements WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [selected.id])).rows[0];
      if (!live) throw error(404, 'Phiếu kho đã được xóa.');
      if (selected.archived_at) throw error(409, 'Hàng hóa đã được lưu trữ; không thể thay đổi tồn kho.');
      if (remove) await client.query('UPDATE stock_movements SET deleted_at = now(), updated_at = now(), updated_by = $1 WHERE id = $2', [req.user.userId, selected.id]);
      else await client.query('UPDATE stock_movements SET type = $1, quantity = $2, note = $3, movement_date = $4, updated_at = now(), updated_by = $5 WHERE id = $6', [type, quantity, note.trim(), date, req.user.userId, selected.id]);
      return recalculateStock(client, selected.product_id);
    });
    res.json({ message: remove ? 'Đã xóa phiếu và cập nhật tồn kho.' : 'Đã sửa phiếu và cập nhật tồn kho.', stockQuantity });
  } catch (failure) { fail(res, next, failure); }
}
const updateMovement = (req, res, next) => changeMovement(req, res, next, false);
const deleteMovement = (req, res, next) => changeMovement(req, res, next, true);
module.exports = { listInventory, listMovements, moveStock, updateMovement, deleteMovement, checkout };
