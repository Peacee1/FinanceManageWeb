const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const routes = require('../routes/businessRoutes');
after(() => db.close());

test('cafe tables isolate businesses, restrict creation and synchronize occupancy safely', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const users = []; const businesses = []; let server;
  const suffix = randomUUID().slice(0, 10);
  const secret = process.env.JWT_SECRET || 'test-secret-that-is-longer-than-32-characters';
  process.env.JWT_SECRET = secret;
  try {
    for (const role of ['owner', 'employee', 'owner']) users.push((await db.query('INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id', ['Cafe test', `${users.length}-${suffix}@example.invalid`, 'invalid-test-hash', role])).rows[0].id);
    for (const owner of [users[0], users[2]]) businesses.push((await db.query('INSERT INTO businesses(owner_id,business_code,model,name) VALUES ($1,$2,$3,$4) RETURNING id', [owner, `CAFE-${businesses.length}-${suffix}`, businesses.length ? 'Quán ăn' : 'Quán cafe', 'Cafe test'])).rows[0].id);
    await db.query("INSERT INTO employees(business_id,user_id,employee_code,name) VALUES ($1,$2,1,'Cafe test')", [businesses[0], users[1]]);
    const app = express(); app.use(express.json()); app.use('/api/business', routes);
    app.use((error, req, res, next) => res.status(500).json({ message: 'INTERNAL' }));
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const call = async (user, method, path, body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/business${path}`, { method, headers: { Authorization: `Bearer ${jwt.sign({ userId: user }, secret)}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await call(users[1], 'GET', '/context')).body.business.id, businesses[0]);
    assert.equal((await call(users[1], 'POST', '/tables', { name: 'Bàn 1' })).status, 403);
    assert.equal((await call(users[0], 'POST', '/tables', { name: ' ' })).status, 400);
    const created = await call(users[0], 'POST', '/tables', { name: ' Bàn   1 ' });
    assert.equal(created.status, 201); assert.equal(created.body.table.name, 'Bàn 1');
    assert.equal((await call(users[0], 'POST', '/tables', { name: 'bàn 1' })).status, 409);
    assert.equal((await call(users[2], 'GET', '/tables')).status, 403);
    assert.equal((await call(users[2], 'GET', `/tables?businessId=${businesses[0]}`)).status, 403);
    await db.query("UPDATE businesses SET model='Quan cafe' WHERE id=$1", [businesses[1]]);
    assert.equal((await call(users[2], 'GET', '/tables')).status, 200);
    const path = `/tables/${created.body.table.id}/occupancy`;
    assert.equal((await call(users[2], 'PATCH', path, { isOccupied: true, version: 0 })).status, 404);
    assert.equal((await call(users[1], 'PATCH', path, { isOccupied: 'true', version: 0 })).status, 400);
    const occupied = await call(users[1], 'PATCH', path, { isOccupied: true, version: 0 });
    assert.equal(occupied.status, 200); assert.equal(occupied.body.table.version, 1);
    assert.equal((await call(users[0], 'GET', '/tables')).body.tables[0].is_occupied, true);
    assert.equal((await call(users[0], 'PATCH', path, { isOccupied: false, version: 0 })).status, 409);
    assert.equal((await call(users[1], 'PATCH', path, { isOccupied: true, version: 0 })).body.table.version, 1);
    const cleared = await call(users[0], 'PATCH', path, { isOccupied: false, version: 1 });
    assert.equal(cleared.status, 200); assert.equal(cleared.body.table.version, 2);
    assert.equal((await call(users[1], 'GET', '/tables')).body.tables[0].is_occupied, false);
    const concurrent = await Promise.all(Array.from({ length: 4 }, () => call(users[1], 'PATCH', path, { isOccupied: true, version: 2 })));
    assert.ok(concurrent.every(result => result.status === 200 && result.body.table.version === 3));
    await db.query('UPDATE users SET is_active=false WHERE id=$1', [users[1]]);
    assert.equal((await call(users[1], 'GET', '/tables')).status, 401);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await db.query('DELETE FROM employees WHERE business_id=ANY($1::int[])', [businesses]);
    await db.query('DELETE FROM businesses WHERE id=ANY($1::int[])', [businesses]);
    await db.query('DELETE FROM users WHERE id=ANY($1::int[])', [users]);
  }
});
