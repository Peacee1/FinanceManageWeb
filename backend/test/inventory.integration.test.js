const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const routes = require('../routes/businessRoutes');
const { vietnamDate } = require('../utils/businessDate');
after(() => db.close());

test('inventory permissions, stock corrections, atomic checkout and retry protection', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const suffix = randomUUID().slice(0, 10);
  const users = []; const businesses = []; let server;
  const secret = process.env.JWT_SECRET || 'test-secret-that-is-longer-than-32-characters';
  process.env.JWT_SECRET = secret;
  try {
    for (const role of ['owner', 'employee', 'owner']) {
      const user = (await db.query('INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id', ['Inventory integration', `${users.length}-${suffix}@example.invalid`, 'invalid-test-hash', role])).rows[0];
      users.push(user.id);
    }
    for (const owner of [users[0], users[2]]) businesses.push((await db.query("INSERT INTO businesses(owner_id,business_code,model,name) VALUES ($1,$2,'Quan cafe','Inventory integration') RETURNING id", [owner, `INV-${businesses.length}-${suffix}`])).rows[0].id);
    await db.query('UPDATE businesses SET auto_approve_transactions=true WHERE id=ANY($1::int[])', [businesses]);
    await db.query("INSERT INTO employees(business_id,user_id,employee_code,name) VALUES ($1,$2,1,'Inventory integration')", [businesses[0], users[1]]);
    const product = (await db.query("INSERT INTO products(business_id,name,price) VALUES ($1,'Tracked test product',1000) RETURNING id", [businesses[0]])).rows[0].id;
    const foreignProduct = (await db.query("INSERT INTO products(business_id,name,price) VALUES ($1,'Foreign test product',1000) RETURNING id", [businesses[1]])).rows[0].id;
    const app = express(); app.use(express.json()); app.use('/api/business', routes);
    app.use((failure, req, res, next) => res.status(500).json({ message: failure.code || 'INTERNAL' }));
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api/business`;
    const call = async (user, method, path, body) => {
      const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${jwt.sign({ userId: user }, secret)}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    const movement = (quantity, type = 'IN') => ({ productId: product, quantity, type, note: 'Test stock', requestId: randomUUID() });
    const stock = async () => (await db.query('SELECT stock_quantity FROM products WHERE id = $1', [product])).rows[0].stock_quantity;
    assert.equal((await call(users[1], 'GET', '/inventory/movements')).status, 403);
    assert.equal((await call(users[1], 'POST', '/inventory/movements', movement(0))).status, 400);
    assert.equal((await call(users[1], 'POST', '/inventory/movements', { ...movement(2), productId: foreignProduct })).status, 404);
    const receiptRequest = movement(10);
    const receipt = await call(users[1], 'POST', '/inventory/movements', receiptRequest);
    assert.equal(receipt.status, 201); assert.equal(await stock(), 10);
    const repeatedReceipts = await Promise.all(Array.from({ length: 4 }, () => call(users[1], 'POST', '/inventory/movements', receiptRequest)));
    assert.ok(repeatedReceipts.every(result => result.status === 200));
    assert.equal(await stock(), 10);
    assert.equal((await call(users[1], 'PUT', `/inventory/movements/${receipt.body.movement.id}`, {})).status, 403);
    assert.equal((await call(users[1], 'DELETE', `/inventory/movements/${receipt.body.movement.id}`)).status, 403);
    const firstSale = { items: [{ productId: product, quantity: 3 }], requestId: randomUUID(), paymentMethod: 'TRANSFER' };
    assert.equal((await call(users[1], 'POST', '/checkout', { ...firstSale, paymentMethod: undefined })).status, 400);
    const retries = await Promise.all(Array.from({ length: 6 }, () => call(users[1], 'POST', '/checkout', firstSale)));
    assert.equal(retries.filter(result => result.status === 201).length, 1);
    assert.ok(retries.every(result => [200, 201].includes(result.status)));
    assert.equal(new Set(retries.map(result => result.body.transaction.id)).size, 1);
    assert.equal(retries[0].body.transaction.payment_method, 'TRANSFER');
    assert.equal(Number(retries[0].body.transaction.amount), 3000);
    assert.equal(await stock(), 7);
    assert.equal((await call(users[1], 'POST', '/checkout', { ...firstSale, paymentMethod: 'CASH' })).status, 409);
    assert.equal((await call(users[1], 'POST', '/checkout', { items: [{ productId: product, quantity: 2 }, { productId: foreignProduct, quantity: 1 }], requestId: randomUUID(), paymentMethod: 'CASH' })).status, 404);
    assert.equal(await stock(), 7);
    const competing = await Promise.all(Array.from({ length: 2 }, () => call(users[1], 'POST', '/checkout', { items: [{ productId: product, quantity: 5 }], requestId: randomUUID(), paymentMethod: 'CASH' })));
    assert.deepEqual(competing.map(result => result.status).sort(), [201, 409]);
    assert.equal(await stock(), 2);
    const history = await call(users[0], 'GET', '/inventory/movements');
    assert.equal(history.status, 200); assert.equal(history.body.movements.length, 3);
    assert.ok(history.body.movements.every(row => row.actor_name === 'Inventory integration' && row.product_name === 'Tracked test product' && row.movement_date));
    assert.equal((await call(users[2], 'GET', `/inventory/movements?businessId=${businesses[0]}`)).status, 403);
    assert.equal((await call(users[0], 'DELETE', `/inventory/movements/${receipt.body.movement.id}`)).status, 409);
    assert.equal(await stock(), 2);
    assert.equal((await call(users[0], 'PUT', `/inventory/movements/${receipt.body.movement.id}`, { type: 'IN', quantity: 6, note: 'Invalid correction', date: vietnamDate() })).status, 409);
    assert.equal(await stock(), 2);
    assert.equal((await call(users[0], 'PUT', `/inventory/movements/${receipt.body.movement.id}`, { type: 'IN', quantity: 12, note: 'Corrected receipt', date: vietnamDate() })).status, 200);
    assert.equal(await stock(), 4);
    const manual = await call(users[1], 'POST', '/inventory/movements', movement(1, 'OUT'));
    assert.equal(manual.status, 201); assert.equal(await stock(), 3);
    assert.equal((await call(users[0], 'DELETE', `/inventory/movements/${manual.body.movement.id}`)).status, 200);
    assert.equal(await stock(), 4);
    assert.equal((await call(users[0], 'DELETE', `/products/${product}`)).status, 409);
    const totals = (await db.query('SELECT count(*) AS count,sum(amount) AS amount FROM transactions WHERE business_id = $1', [businesses[0]])).rows[0];
    assert.equal(Number(totals.count), 2); assert.equal(Number(totals.amount), 8000);
    const daily = (await db.query('SELECT SUM(income) AS income FROM business_daily_totals WHERE business_id = $1', [businesses[0]])).rows[0];
    assert.equal(Number(daily.income), 8000);
    const employeeId = (await db.query('SELECT id FROM employees WHERE user_id = $1', [users[1]])).rows[0].id;
    assert.equal((await call(users[0], 'DELETE', `/employees/${employeeId}`)).status, 200);
    assert.equal((await call(users[1], 'GET', '/inventory')).status, 401);
    assert.equal(Number((await db.query('SELECT count(*) AS count FROM transactions WHERE business_id = $1', [businesses[0]])).rows[0].count), 2);
    assert.ok((await call(users[0], 'GET', '/inventory/movements')).body.movements.every(row => row.actor_name === 'Inventory integration'));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (businesses.length) {
      await db.query('DELETE FROM stock_movements WHERE business_id = ANY($1::int[])', [businesses]);
      await db.query('DELETE FROM sale_items WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = ANY($1::int[]))', [businesses]);
      await db.query('DELETE FROM transactions WHERE business_id = ANY($1::int[])', [businesses]);
      await db.query('DELETE FROM products WHERE business_id = ANY($1::int[])', [businesses]);
      await db.query('DELETE FROM businesses WHERE id = ANY($1::int[])', [businesses]);
    }
    if (users.length) await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [users]);
  }
});
