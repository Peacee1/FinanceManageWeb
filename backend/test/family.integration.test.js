const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const { createFamily, joinFamily, getFamily, dissolveFamily, leaveFamily, resolveDissolution, buySlot } = require('../controllers/familyController');
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
test('family sync choices, creator-only dissolution, member leave and paid slots are atomic and replay-safe', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const users = []; let familyId;
  const payload = amount => ({ type: 'INCOME', amount, category: 'Lương', date: '2026-10-02' });
  try {
    for (let i=0;i<3;i++) users.push({ userId: (await db.query("INSERT INTO users(name,email,password_hash,role,coin) VALUES('Lifecycle test',$1,'test','owner',3000) RETURNING id", [`${randomUUID()}@example.invalid`])).rows[0].id, role: 'owner' });
    await invoke(addTransaction, users[0], { ...payload(100), location: { lat: 10.77, lng: 106.7, label: 'Địa điểm cũ' } });
    await invoke(addTransaction, users[1], payload(200));
    const created = await invoke(createFamily, users[0], { name: 'Lifecycle', syncPersonal: true });
    familyId = created.body.family.id; const inviteCode = created.body.family.invite_code;
    await invoke(joinFamily, users[1], { inviteCode, syncPersonal: false });
    assert.deepEqual((await invoke(getTransactions, users[1])).body.map(t => Number(t.amount)), [100]);
    assert.equal((await invoke(getTransactions, users[1])).body[0].location.label, 'Địa điểm cũ');
    assert.equal((await invoke(dissolveFamily, users[1])).statusCode, 403);
    assert.equal((await invoke(leaveFamily, users[0])).statusCode, 403);
    assert.equal((await invoke(joinFamily, users[2], { inviteCode })).statusCode, 409);
    const requestId = randomUUID();
    const purchases = await Promise.all([1,2].map(() => invoke(buySlot, users[1], { requestId })));
    assert.equal(purchases[0].body.member_capacity, 3); assert.equal(purchases[1].body.coin, 1500);
    assert.equal((await invoke(getProfile, users[1])).body.coin, 1500);
    await db.query('UPDATE users SET coin=0 WHERE id=$1', [users[0].userId]);
    assert.equal((await invoke(buySlot, users[0], { requestId: randomUUID() })).statusCode, 400);
    assert.equal((await invoke(joinFamily, users[2], { inviteCode })).statusCode, 200);
    const located = await invoke(addTransaction, users[1], { ...payload(30), location: { lat: 21, lng: 105, label: 'Điểm thu nhập' } });
    assert.equal(located.body.location.lat, 21);
    assert.equal((await invoke(updateTransaction, users[2], { location: { lat: 11, lng: 107, label: 'Điểm thu nhập' } }, {}, { id: located.body.id })).statusCode, 200);
    await invoke(addTransaction, users[0], payload(40));
    assert.equal((await invoke(leaveFamily, users[1])).statusCode, 200);
    const left = (await invoke(getFamily, users[1])).body;
    assert.equal(left.pending[0].event_type, 'left'); assert.equal(left.mode, 'personal');
    assert.equal((await invoke(resolveDissolution, users[2], { noticeId: left.pending[0].id, syncData: true })).statusCode, 404);
    assert.equal((await invoke(joinFamily, users[1], { inviteCode })).statusCode, 409);
    const decision = { noticeId: left.pending[0].id, syncData: true };
    await Promise.all([1,2].map(() => invoke(resolveDissolution, users[1], decision)));
    assert.deepEqual((await invoke(getTransactions, users[1])).body.map(t => Number(t.amount)).sort((a,b)=>a-b), [30,200]);
    assert.equal((await invoke(getTransactions, users[1])).body.find(tx => Number(tx.amount) === 30).location.label, 'Điểm thu nhập');
    assert.equal((await invoke(getFamily, users[1])).body.pending.length, 0);
    assert.equal((await invoke(dissolveFamily, users[0])).statusCode, 200);
    assert.equal((await invoke(joinFamily, users[1], { inviteCode })).statusCode, 404);
    const ownerNotice = (await invoke(getFamily, users[0])).body.pending[0];
    await invoke(resolveDissolution, users[0], { noticeId: ownerNotice.id, syncData: true });
    assert.deepEqual((await invoke(getTransactions, users[0])).body.map(t => Number(t.amount)).sort((a,b)=>a-b), [40,100]);
    const thirdNotice = (await invoke(getFamily, users[2])).body.pending[0];
    await invoke(resolveDissolution, users[2], { noticeId: thirdNotice.id, syncData: false });
    assert.equal((await invoke(getFamily, users[2])).body.pending.length, 0);
    assert.equal((await invoke(getTransactions, users[2])).body.length, 0);
  } finally {
    await db.query('DELETE FROM users WHERE id=ANY($1::int[])', [users.map(user => user.userId)]);
    if (familyId) await db.query('DELETE FROM families WHERE id=$1', [familyId]);
  }
});
test('location validation, edit/remove and map preferences remain scoped to each account', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const users=[];
  try {
    for(let i=0;i<2;i++) users.push({ userId:(await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Map test',$1,'test','owner') RETURNING id", [`${randomUUID()}@example.invalid`])).rows[0].id, role:'owner' });
    const payload={type:'EXPENSE',amount:100,category:'Ăn uống',date:'2026-10-02'};
    assert.equal((await invoke(addTransaction,users[0],{...payload,location:{lat:91,lng:1}})).statusCode,400);
    const added=await invoke(addTransaction,users[0],{...payload,location:{lat:0,lng:0,label:'Zero'}});
    assert.equal(added.body.location.lat,0);
    assert.equal((await invoke(updateTransaction,users[1],{location:null},{},{id:added.body.id})).statusCode,404);
    await invoke(updateTransaction,users[0],{location:{lat:-30,lng:170,label:'New'}},{},{id:added.body.id});
    assert.equal((await invoke(getTransactions,users[0])).body[0].location.lat,-30);
    await invoke(updateTransaction,users[0],{location:null},{},{id:added.body.id});
    assert.equal((await invoke(getTransactions,users[0])).body[0].location,null);
    await invoke(updateSettings,users[0],{mapsEnabled:true});
    assert.equal((await invoke(getProfile,users[0])).body.maps_enabled,true);
    assert.equal((await invoke(getProfile,users[1])).body.maps_enabled,false);
    assert.equal((await invoke(updateSettings,users[0],{mapsEnabled:'yes'})).statusCode,400);
  } finally { await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[users.map(user=>user.userId)]); }
});
