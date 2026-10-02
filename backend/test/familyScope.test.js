const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const { transactionScope } = require('../utils/transactionScope');
after(() => db.close());
test('active family is the only accessible household ledger', async () => {
  const original = db.query;
  try {
    db.query = async () => ({ rows: [{ family_id: 7 }] });
    const request = { user: { userId: 2, role: 'owner' }, query: {}, body: {} };
    const scope = await transactionScope(request);
    assert.equal(scope.familyId, 7); assert.deepEqual(scope.params, [7]);
    assert.equal(scope.clause, 't.family_id = $1 AND t.business_id IS NULL');
    request.query.scope = 'personal'; assert.equal((await transactionScope(request)).error, 403);
    db.query = async () => ({ rows: [{ family_id: null }] });
    request.query.scope = 'family'; assert.equal((await transactionScope(request)).error, 403);
    request.query.scope = 'personal'; assert.match((await transactionScope(request)).clause, /t.family_id IS NULL/);
    request.user.role = 'employee'; assert.equal((await transactionScope(request)).error, 403);
  } finally { db.query = original; }
});
