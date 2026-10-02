const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const { createFamily, joinFamily } = require('../controllers/familyController');
const { addTransaction, getTransactions, getSummary, updateTransaction, deleteTransaction } = require('../controllers/transactionController');
const { getProfile, updateSettings } = require('../controllers/userController');
after(() => db.close());
const invoke = async (handler, user, body = {}, query = {}, params = {}) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, setHeader() {} };
  await handler({ user, body, query, params }, res, error => { throw error; }); return res;
};
test('two family members share calendar and totals; personal history and outsiders stay isolated', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const users = []; let familyId;
  const payload = amount => ({ type: 'INCOME', amount, category: 'Lương', date: '2026-10-02' });
  try {
    for (let i = 0; i < 4; i++) users.push({ userId: (await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Family test',$1,'test','owner') RETURNING id", [`${randomUUID()}@example.invalid`])).rows[0].id, role: 'owner' });
    const old = await invoke(addTransaction, users[0], payload(99));
    const created = await invoke(createFamily, users[0], { name: 'Gia đình test' });
    familyId = created.body.family.id;
    const code = created.body.family.invite_code;
    const joins = await Promise.all([users[1], users[2]].map(user => invoke(joinFamily, user, { inviteCode: code })));
    assert.deepEqual(joins.map(result => result.statusCode).sort(), [200, 409]);
    const partner = users[joins[0].statusCode === 200 ? 1 : 2];
    assert.equal((await invoke(createFamily, partner, { name: 'Another' })).statusCode, 409);
    assert.equal((await invoke(getTransactions, users[0], {}, { scope: 'personal' })).statusCode, 403);
    await invoke(addTransaction, users[0], payload(10));
    const shared = await invoke(addTransaction, partner, payload(20));
    assert.deepEqual((await invoke(getTransactions, users[0])).body.map(tx => Number(tx.amount)).sort((a,b) => a-b), [10,20]);
    assert.equal(Number((await invoke(getSummary, partner, {}, { month: '10', year: '2026' })).body.month_income), 30);
    assert.equal((await invoke(updateTransaction, users[0], { amount: 25 }, {}, { id: shared.body.id })).statusCode, 200);
    assert.equal((await invoke(deleteTransaction, users[3], {}, {}, { id: shared.body.id })).statusCode, 404);
    assert.equal((await invoke(deleteTransaction, partner, {}, {}, { id: old.body.id })).statusCode, 404);
    await invoke(updateSettings, users[0], { monthlyBudgets: { '2026-10': 500 }, separatePersonalWallets: true });
    const profile = (await invoke(getProfile, partner)).body;
    assert.equal(profile.finance_mode, 'family'); assert.equal(profile.monthly_budgets['2026-10'], 500);
    assert.equal((await invoke(addTransaction, partner, payload(1))).statusCode, 400);
    assert.equal((await invoke(deleteTransaction, partner, {}, {}, { id: shared.body.id })).statusCode, 200);
    assert.equal((await invoke(getTransactions, users[3])).body.length, 0);
  } finally {
    await db.query('DELETE FROM users WHERE id=ANY($1::int[])', [users.map(user => user.userId)]);
    if (familyId) await db.query('DELETE FROM families WHERE id=$1', [familyId]);
  }
});
