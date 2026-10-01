const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const { addTransaction, getTransactions, getSummary, deleteTransaction, updateTransaction } = require('../controllers/transactionController');
const { updateSettings, getProfile } = require('../controllers/userController');
after(() => db.close());
function response() { return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
test('personal and business revenue stay separate and ownership is enforced', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const suffix = randomUUID().slice(0, 12);
  const users = []; const businesses = [];
  const invoke = async (handler, user, query = {}, body = {}, params = {}) => {
    const res = response(); await handler({ user, query, body, params }, res, error => { throw error; }); return res;
  };
  try {
    for (const role of ['owner', 'employee', 'owner']) {
      const result = await db.query('INSERT INTO users(name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id', ['Scope integration', `${role}-${users.length}-${suffix}@example.invalid`, 'not-a-valid-password-hash', role]);
      users.push({ userId: result.rows[0].id, role });
    }
    for (const owner of [users[0], users[2]]) {
      const result = await db.query("INSERT INTO businesses(owner_id, business_code, model, name) VALUES ($1, $2, 'Quan cafe', 'Scope integration') RETURNING id", [owner.userId, `TEST-${businesses.length}-${suffix}`]);
      businesses.push(result.rows[0].id);
    }
    await db.query('UPDATE businesses SET auto_approve_transactions=true WHERE id=ANY($1::int[])', [businesses]);
    await db.query("INSERT INTO employees(business_id, user_id, employee_code, name) VALUES ($1, $2, 1, 'Scope integration')", [businesses[0], users[1].userId]);
    const payload = amount => ({ type: 'INCOME', amount, category: 'Integration', date: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) });
    const personal = await invoke(addTransaction, users[0], {}, payload(10));
    const employee = await invoke(addTransaction, users[1], { scope: 'business' }, { ...payload(20), date: '1999-01-01', paymentMethod: 'CASH', requestId: randomUUID() });
    await invoke(addTransaction, users[0], { scope: 'business' }, payload(30));
    await invoke(addTransaction, users[2], { scope: 'business' }, payload(40));
    assert.equal(personal.body.business_id, null);
    assert.equal(employee.body.business_id, businesses[0]);
    assert.equal(new Date(employee.body.date).toISOString().slice(0, 10), payload(20).date);
    const personalList = await invoke(getTransactions, users[0]);
    assert.deepEqual(personalList.body.map(tx => Number(tx.amount)), [10]);
    const businessList = await invoke(getTransactions, users[0], { scope: 'business' });
    assert.deepEqual(businessList.body.map(tx => Number(tx.amount)).sort(), [20, 30]);
    const firstPage = await invoke(getTransactions, users[0], { scope: 'business', limit: '1' });
    assert.equal(firstPage.body.length, 1);
    const secondPage = await invoke(getTransactions, users[0], { scope: 'business', limit: '1', cursor: firstPage.headers['X-Next-Cursor'] });
    assert.equal(secondPage.body.length, 1);
    assert.notEqual(firstPage.body[0].id, secondPage.body[0].id);
    const oldSummary = await invoke(getSummary, users[0], { scope: 'business', month: '1', year: '1999' });
    assert.equal(Number(oldSummary.body.month_income), 0);
    const employeeList = await invoke(getTransactions, users[1], { scope: 'business' });
    assert.deepEqual(employeeList.body.map(tx => Number(tx.amount)), [20]);
    const summary = await invoke(getSummary, users[0], { scope: 'business' });
    assert.equal(Number(summary.body.today_income), 50);
    const forbidden = await invoke(getTransactions, users[2], { scope: 'business', businessId: businesses[0] });
    assert.equal(forbidden.statusCode, 403);
    const wrongScope = await invoke(deleteTransaction, users[0], {}, {}, { id: employee.body.id });
    assert.equal(wrongScope.statusCode, 404);
    const unrelated = await invoke(deleteTransaction, users[2], { scope: 'business' }, {}, { id: employee.body.id });
    assert.equal(unrelated.statusCode, 404);
    assert.equal((await invoke(getProfile, users[0])).body.personal_accent, 'purple');
    assert.equal((await invoke(updateSettings, users[0], {}, { personalAccent: 'invalid' })).statusCode, 400);
    assert.equal((await invoke(updateSettings, users[0], {}, { personalAccent: 'pink' })).statusCode, 200);
    assert.equal((await invoke(getProfile, users[0])).body.personal_accent, 'pink');
    assert.equal((await invoke(getProfile, users[2])).body.personal_accent, 'purple');
    assert.equal((await invoke(updateSettings, users[1], {}, { personalAccent: 'blue' })).statusCode, 403);
    assert.equal((await invoke(getProfile, users[0])).body.separate_personal_wallets, false);
    assert.equal((await invoke(updateSettings, users[0], {}, { separatePersonalWallets: 'true' })).statusCode, 400);
    assert.equal((await invoke(updateSettings, users[1], {}, { separatePersonalWallets: true })).statusCode, 403);
    assert.equal((await invoke(updateSettings, users[0], {}, { separatePersonalWallets: true, userId: users[2].userId })).statusCode, 200);
    assert.equal((await invoke(getProfile, users[0])).body.separate_personal_wallets, true);
    assert.equal((await invoke(getProfile, users[2])).body.separate_personal_wallets, false);
    assert.equal((await invoke(addTransaction, users[0], {}, payload(100))).statusCode, 400);
    assert.equal((await invoke(addTransaction, users[0], {}, { ...payload(100), paymentMethod: 'INVALID' })).statusCode, 400);
    const cash = await invoke(addTransaction, users[0], {}, { ...payload(100), paymentMethod: 'CASH' });
    const bank = await invoke(addTransaction, users[0], {}, { ...payload(200), paymentMethod: 'TRANSFER' });
    assert.equal(cash.body.payment_method, 'CASH'); assert.equal(bank.body.payment_method, 'TRANSFER');
    assert.equal(bank.body.bank_payment_status, 'MANUAL'); assert.equal(bank.body.bankPayment, null);
    assert.equal((await invoke(updateTransaction, users[0], {}, { amount: 11 }, { id: personal.body.id })).statusCode, 400);
    assert.equal((await invoke(updateTransaction, users[0], {}, { paymentMethod: 'CASH' }, { id: personal.body.id })).body.payment_method, 'CASH');
    assert.equal((await invoke(updateTransaction, users[0], {}, { description: 'Preserve source' }, { id: cash.body.id })).body.payment_method, 'CASH');
    assert.equal((await invoke(updateTransaction, users[2], {}, { paymentMethod: 'TRANSFER' }, { id: cash.body.id })).statusCode, 404);
    await invoke(updateSettings, users[0], {}, { separatePersonalWallets: false });
    assert.equal((await invoke(getTransactions, users[0])).body.find(row => row.id === bank.body.id).payment_method, 'TRANSFER');
    assert.equal((await invoke(addTransaction, users[0], {}, payload(1))).statusCode, 201);

  } finally {
    if (users.length) await db.query('DELETE FROM transactions WHERE user_id = ANY($1::int[])', [users.map(user => user.userId)]);
    if (businesses.length) await db.query('DELETE FROM businesses WHERE id = ANY($1::int[])', [businesses]);
    if (users.length) await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [users.map(user => user.userId)]);
  }
});
