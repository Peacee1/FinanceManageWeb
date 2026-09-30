const db = require('../config/db');
const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const { isPositiveInteger } = require('../utils/validation');

const isNonnegativeMoney = value => Number(value) === 0 && /^(0|0+)$/.test(String(value)) || isPositiveInteger(value);

const PRODUCT_ENABLED_MODELS = ['Quan cafe', 'Quan net', 'Quan bi a', 'Quan an'];

const generateBusinessCode = (model) => {
  const prefixMap = {
    'Quan cafe': 'CAFE', 'Quan net': 'NET', 'Quan bi a': 'BIA', 'Quan an': 'FOOD',
    'Doanh nghiep nho (10-20 nhan su)': 'SME', 'Doanh nghiep vua (20-100 nhan su)': 'MED',
  };
  const prefix = prefixMap[model] || 'BIZ';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix + '-' + suffix;
};

const createBusiness = async (req, res) => {
  const ownerId = req.user.userId;
  const { model, name, maxEmployees } = req.body;
  const avatarUrl = req.file ? '/uploads/' + req.file.filename : null;
  if (typeof model !== 'string' || model.length > 50 || typeof name !== 'string' || !name.trim() || name.length > 100 || (maxEmployees !== undefined && (!isPositiveInteger(maxEmployees) || Number(maxEmployees) > 50))) return res.status(400).json({ message: 'Vui long nhap day du thong tin.' });
  try {
    const existing = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Ban da co ho so doanh nghiep.' });
    const isMedium = model.includes('vua');
    const computedMax = isMedium ? 50 : 20;
    const finalMax = Math.min(parseInt(maxEmployees) || computedMax, computedMax);
    let businessCode; let isUnique = false;
    while (!isUnique) {
      businessCode = generateBusinessCode(model);
      const check = await db.query('SELECT id FROM businesses WHERE business_code = $1', [businessCode]);
      if (check.rows.length === 0) isUnique = true;
    }
    const result = await db.query(
      'INSERT INTO businesses (owner_id, business_code, model, name, avatar_url, max_employees) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ownerId, businessCode, model, name, avatarUrl, finalMax]
    );
    res.status(201).json({ message: 'Tao ho so thanh cong.', business: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const getMyBusiness = async (req, res) => {
  const ownerId = req.user.userId;
  try {
    const result = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Chua co ho so doanh nghiep.' });
    res.json({ business: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const updateBusiness = async (req, res) => {
  const ownerId = req.user.userId;
  const { name, maxEmployees } = req.body;
  if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) || (maxEmployees !== undefined && (!isPositiveInteger(maxEmployees) || Number(maxEmployees) > 50))) return res.status(400).json({ message: 'Thông tin doanh nghiệp không hợp lệ.' });
  try {
    const bizResult = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const biz = bizResult.rows[0];
    const avatarUrl = req.file ? '/uploads/' + req.file.filename : biz.avatar_url;
    const isMedium = biz.model.includes('vua');
    const computedMax = isMedium ? 50 : 20;
    const finalMax = maxEmployees ? Math.min(parseInt(maxEmployees), computedMax) : biz.max_employees;
    const result = await db.query(
      'UPDATE businesses SET name = $1, avatar_url = $2, max_employees = $3 WHERE owner_id = $4 RETURNING *',
      [name || biz.name, avatarUrl, finalMax, ownerId]
    );
    res.json({ message: 'Cap nhat thanh cong.', business: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const addEmployee = async (req, res, next) => {
  const { name, age, salary } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || (age !== undefined && (!isPositiveInteger(age) || Number(age) > 120)) || (salary !== undefined && !isNonnegativeMoney(salary))) return res.status(400).json({ message: 'Thông tin nhân viên không hợp lệ.' });
  const defaultPassword = randomBytes(12).toString('base64url');
  try {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const result = await db.transaction(async client => {
      // Serialize employee creation per business to enforce limits and unique codes.
      const biz = (await client.query('SELECT * FROM businesses WHERE owner_id = $1 FOR UPDATE', [req.user.userId])).rows[0];
      if (!biz) return { status: 404, message: 'Chưa có hồ sơ doanh nghiệp.' };
      const count = (await client.query('SELECT COUNT(*) FROM employees WHERE business_id = $1', [biz.id])).rows[0].count;
      if (Number(count) >= biz.max_employees) return { status: 400, message: 'Đã đạt giới hạn nhân viên.' };
      const code = biz.next_employee_code;
      await client.query('UPDATE businesses SET next_employee_code = next_employee_code + 1 WHERE id = $1', [biz.id]);
      const username = biz.business_code + code;
      const user = (await client.query("INSERT INTO users (name, email, password_hash, plan, role, username, must_change_password) VALUES ($1, $2, $3, 'normal', 'employee', $4, true) RETURNING id", [name, username + '@emp.local', passwordHash, username])).rows[0];
      const employee = (await client.query('INSERT INTO employees (business_id, user_id, employee_code, name, age, salary, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [biz.id, user.id, code, name, age || null, salary || 0, req.file ? '/uploads/' + req.file.filename : null])).rows[0];
      return { employee: { ...employee, username }, username };
    });
    if (result.status) return res.status(result.status).json({ message: result.message });
    res.status(201).json({ message: 'Thêm nhân viên thành công.', ...result, defaultPassword });
  } catch (error) { next(error); }
};

const listEmployees = async (req, res) => {
  const ownerId = req.user.userId;
  try {
    const bizResult = await db.query('SELECT id, business_code FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Chua co ho so doanh nghiep.' });
    const biz = bizResult.rows[0];
    const result = await db.query(
      'SELECT e.*, u.username FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.business_id = $1 ORDER BY e.employee_code ASC',
      [biz.id]
    );
    res.json({ employees: result.rows, businessCode: biz.business_code });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const updateEmployee = async (req, res) => {
  const ownerId = req.user.userId;
  const { id } = req.params;
  const { name, age, salary } = req.body;
  if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) || (age !== undefined && (!isPositiveInteger(age) || Number(age) > 120)) || (salary !== undefined && !isNonnegativeMoney(salary))) return res.status(400).json({ message: 'Thông tin nhân viên không hợp lệ.' });
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const empResult = await db.query('SELECT * FROM employees WHERE id = $1 AND business_id = $2', [id, bizResult.rows[0].id]);
    if (empResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay nhan vien.' });
    const emp = empResult.rows[0];
    const avatarUrl = req.file ? '/uploads/' + req.file.filename : emp.avatar_url;
    const result = await db.query(
      'UPDATE employees SET name = $1, age = $2, salary = $3, avatar_url = $4 WHERE id = $5 RETURNING *',
      [name || emp.name, age || emp.age, salary ?? emp.salary, avatarUrl, id]
    );
    if (name && emp.user_id) await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, emp.user_id]);
    res.json({ message: 'Cap nhat nhan vien thanh cong.', employee: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const removeEmployee = async (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) return res.status(400).json({ message: 'Mã nhân viên không hợp lệ.' });
  try {
    const removed = await db.transaction(async client => {
      const employee = (await client.query(`SELECT e.* FROM employees e JOIN businesses b ON b.id = e.business_id
        WHERE e.id = $1 AND b.owner_id = $2 FOR UPDATE OF e`, [req.params.id, req.user.userId])).rows[0];
      if (!employee) return false;
      // Keep financial and stock history while revoking the former employee's access.
      if (employee.user_id) await client.query("UPDATE users SET is_active = false WHERE id = $1 AND role = 'employee'", [employee.user_id]);
      await client.query('DELETE FROM employees WHERE id = $1', [employee.id]);
      return true;
    });
    if (!removed) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    res.json({ message: 'Đã xóa nhân viên và khóa tài khoản; lịch sử được giữ nguyên.' });
  } catch (failure) { next(failure); }
};

const addProduct = async (req, res) => {
  const ownerId = req.user.userId;
  const { name, price } = req.body;
  const avatarUrl = req.file ? '/uploads/' + req.file.filename : null;
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || !isPositiveInteger(price)) return res.status(400).json({ message: 'Vui long nhap du thong tin san pham.' });
  try {
    const bizResult = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Chua co ho so doanh nghiep.' });
    const biz = bizResult.rows[0];
    const result = await db.query(
      'INSERT INTO products (business_id, name, price, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [biz.id, name, parseInt(price), avatarUrl]
    );
    res.status(201).json({ message: 'Them san pham thanh cong.', product: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const listProducts = async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  try {
    let businessId;
    if (userRole === 'employee') {
      const empResult = await db.query('SELECT business_id FROM employees WHERE user_id = $1', [userId]);
      if (empResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay thong tin nhan vien.' });
      businessId = empResult.rows[0].business_id;
    } else {
      const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [userId]);
      if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Chua co ho so doanh nghiep.' });
      businessId = bizResult.rows[0].id;
    }
    const result = await db.query('SELECT * FROM products WHERE business_id = $1 AND archived_at IS NULL ORDER BY name ASC', [businessId]);
    res.json({ products: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const updateProduct = async (req, res) => {
  const ownerId = req.user.userId;
  const { id } = req.params;
  const { name, price } = req.body;
  if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) || (price !== undefined && !isPositiveInteger(price))) return res.status(400).json({ message: 'Thông tin sản phẩm không hợp lệ.' });
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const prodResult = await db.query('SELECT * FROM products WHERE id = $1 AND business_id = $2 AND archived_at IS NULL', [id, bizResult.rows[0].id]);
    if (prodResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay san pham.' });
    const prod = prodResult.rows[0];
    const avatarUrl = req.file ? '/uploads/' + req.file.filename : prod.avatar_url;
    const result = await db.query(
      'UPDATE products SET name = $1, price = $2, avatar_url = $3 WHERE id = $4 RETURNING *',
      [name || prod.name, price ? parseInt(price) : prod.price, avatarUrl, id]
    );
    res.json({ message: 'Cap nhat san pham thanh cong.', product: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const removeProduct = async (req, res) => {
  const ownerId = req.user.userId;
  const { id } = req.params;
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const deleted = await db.query(
      'UPDATE products SET archived_at = now() WHERE id = $1 AND business_id = $2 AND archived_at IS NULL AND stock_quantity = 0 RETURNING id', [id, bizResult.rows[0].id]
    );
    if (deleted.rows.length === 0) return res.status(409).json({ message: 'Không tìm thấy sản phẩm hoặc sản phẩm còn tồn kho. Hãy xuất hết tồn kho trước khi xóa.' });
    res.json({ message: 'Da xoa san pham.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

module.exports = {
  createBusiness, getMyBusiness, updateBusiness,
  addEmployee, listEmployees, updateEmployee, removeEmployee,
  addProduct, listProducts, updateProduct, removeProduct,
};
