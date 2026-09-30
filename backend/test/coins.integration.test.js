const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const { checkIn, upgradePlan, updateCategories } = require('../controllers/userController');
after(() => db.close());
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
test('concurrent rewards, upgrades and category additions cannot overspend coins', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const email = `integration-${randomUUID()}@example.invalid`;
  const inserted = await db.query("INSERT INTO users(name, email, password_hash, coin) VALUES ('Integration test', $1, 'not-a-valid-password-hash', 5000) RETURNING id", [email]);
  const id = inserted.rows[0].id;
  const invoke = async (handler, body = {}) => {
    const res = response();
    await handler({ user: { userId: id }, body }, res, error => { throw error; });
    return res;
  };
  try {
    const rewards = await Promise.all(Array.from({ length: 8 }, () => invoke(checkIn)));
    assert.equal(rewards.filter(res => res.statusCode === 200).length, 1);
    assert.equal((await db.query('SELECT coin FROM users WHERE id = $1', [id])).rows[0].coin, 5020);
    const upgrades = await Promise.all(Array.from({ length: 8 }, () => invoke(upgradePlan, { targetPlan: 'ultra' })));
    assert.equal(upgrades.filter(res => res.statusCode === 200).length, 1);
    assert.equal((await db.query('SELECT coin FROM users WHERE id = $1', [id])).rows[0].coin, 1520);
    // Client-supplied isAdding=false must not bypass server-side charging.
    const body = { categories: [{ name: 'Test category', type: 'EXPENSE', color: '#7C3AED' }], isAdding: false };
    await Promise.all(Array.from({ length: 8 }, () => invoke(updateCategories, body)));
    assert.equal((await db.query('SELECT coin FROM users WHERE id = $1', [id])).rows[0].coin, 1420);
    await db.query('UPDATE users SET coin = 0 WHERE id = $1', [id]);
    const rejected = await invoke(updateCategories, { categories: [...body.categories, { name: 'Unpaid', type: 'EXPENSE', color: '#7C3AED' }] });
    assert.equal(rejected.statusCode, 400);
    assert.equal((await db.query('SELECT custom_categories FROM users WHERE id = $1', [id])).rows[0].custom_categories.length, 1);
  } finally { await db.query('DELETE FROM users WHERE id = $1', [id]); }
});
