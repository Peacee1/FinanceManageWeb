const db = require('../config/db');
const bcrypt = require('bcrypt');

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
  if (!model || !name) return res.status(400).json({ message: 'Vui long nhap day du thong tin.' });
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

const addEmployee = async (req, res) => {
  const ownerId = req.user.userId;
  const { name, age, salary } = req.body;
  const avatarUrl = req.file ? '/uploads/' + req.file.filename : null;
  if (!name) return res.status(400).json({ message: 'Ten nhan vien khong duoc de trong.' });
  try {
    const bizResult = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Chua co ho so doanh nghiep.' });
    const biz = bizResult.rows[0];
    const countResult = await db.query('SELECT COUNT(*) FROM employees WHERE business_id = $1', [biz.id]);
    if (parseInt(countResult.rows[0].count) >= biz.max_employees) {
      return res.status(400).json({ message: 'Da dat gioi han nhan vien: ' + biz.max_employees });
    }
    const codeResult = await db.query(
      'SELECT COALESCE(MAX(employee_code), 0) + 1 AS next_code FROM employees WHERE business_id = $1', [biz.id]
    );
    const employeeCode = codeResult.rows[0].next_code;
    const username = biz.business_code + employeeCode;
    const defaultPasswordHash = await bcrypt.hash('1', 10);
    const userResult = await db.query(
      "INSERT INTO users (name, email, password_hash, plan, role, username, must_change_password) VALUES ($1, $2, $3, 'normal', 'employee', $4, true) RETURNING id",
      [name, username + '@emp.local', defaultPasswordHash, username]
    );
    const employeeUserId = userResult.rows[0].id;
    const empResult = await db.query(
      'INSERT INTO employees (business_id, user_id, employee_code, name, age, salary, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [biz.id, employeeUserId, employeeCode, name, age || null, salary || 0, avatarUrl]
    );
    res.status(201).json({
      message: 'Them nhan vien thanh cong.',
      employee: { ...empResult.rows[0], username },
      username,
      defaultPassword: '1'
    });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
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
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const empResult = await db.query('SELECT * FROM employees WHERE id = $1 AND business_id = $2', [id, bizResult.rows[0].id]);
    if (empResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay nhan vien.' });
    const emp = empResult.rows[0];
    const avatarUrl = req.file ? '/uploads/' + req.file.filename : emp.avatar_url;
    const result = await db.query(
      'UPDATE employees SET name = $1, age = $2, salary = $3, avatar_url = $4 WHERE id = $5 RETURNING *',
      [name || emp.name, age || emp.age, salary || emp.salary, avatarUrl, id]
    );
    if (name && emp.user_id) await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, emp.user_id]);
    res.json({ message: 'Cap nhat nhan vien thanh cong.', employee: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const removeEmployee = async (req, res) => {
  const ownerId = req.user.userId;
  const { id } = req.params;
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const empResult = await db.query('SELECT * FROM employees WHERE id = $1 AND business_id = $2', [id, bizResult.rows[0].id]);
    if (empResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay nhan vien.' });
    const emp = empResult.rows[0];
    if (emp.user_id) await db.query("DELETE FROM users WHERE id = $1 AND role = 'employee'", [emp.user_id]);
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ message: 'Da xoa nhan vien.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const addProduct = async (req, res) => {
  const ownerId = req.user.userId;
  const { name, price } = req.body;
  const avatarUrl = req.file ? '/uploads/' + req.file.filename : null;
  if (!name || !price) return res.status(400).json({ message: 'Vui long nhap du thong tin san pham.' });
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
    const result = await db.query('SELECT * FROM products WHERE business_id = $1 ORDER BY name ASC', [businessId]);
    res.json({ products: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

const updateProduct = async (req, res) => {
  const ownerId = req.user.userId;
  const { id } = req.params;
  const { name, price } = req.body;
  try {
    const bizResult = await db.query('SELECT id FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizResult.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay doanh nghiep.' });
    const prodResult = await db.query('SELECT * FROM products WHERE id = $1 AND business_id = $2', [id, bizResult.rows[0].id]);
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
      'DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING id', [id, bizResult.rows[0].id]
    );
    if (deleted.rows.length === 0) return res.status(404).json({ message: 'Khong tim thay san pham.' });
    res.json({ message: 'Da xoa san pham.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Loi server.' }); }
};

module.exports = {
  createBusiness, getMyBusiness, updateBusiness,
  addEmployee, listEmployees, updateEmployee, removeEmployee,
  addProduct, listProducts, updateProduct, removeProduct,
};
