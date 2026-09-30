const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { protect, ownerOnly } = require('../middleware/authMiddleware');
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
after(() => db.close());
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const request = (userId = 1) => ({ headers: { authorization: `Bearer ${jwt.sign({ userId, role: 'owner' }, process.env.JWT_SECRET)}` }, originalUrl: '/api/business/create' });
test('missing and malformed tokens cannot access protected endpoints', async () => {
  for (const authorization of [undefined, 'Bearer', 'Bearer invalid', 'Bearer invalid extra']) {
    const res = response();
    await protect({ headers: { authorization } }, res, () => assert.fail('must not authorize'));
    assert.equal(res.statusCode, 401);
  }
});
test('database role overrides token role and deleted users are rejected', async () => {
  const original = db.query;
  try {
    db.query = async () => ({ rows: [{ id: 1, role: 'employee', must_change_password: false }] });
    const req = request(); const res = response(); let passed = false;
    await protect(req, res, () => { passed = true; });
    assert.ok(passed); assert.equal(req.user.role, 'employee');
    ownerOnly(req, res, () => assert.fail('employee must not manage business'));
    assert.equal(res.statusCode, 403);
    db.query = async () => ({ rows: [] });
    const removed = response(); await protect(request(), removed, () => assert.fail('deleted user'));
    assert.equal(removed.statusCode, 401);
  } finally { db.query = original; }
});
test('first-login accounts can only change their password', async () => {
  const original = db.query;
  try {
    db.query = async () => ({ rows: [{ id: 1, role: 'employee', must_change_password: true }] });
    const res = response(); await protect(request(), res, () => assert.fail('must change password'));
    assert.equal(res.statusCode, 403);
    const req = request(); req.originalUrl = '/api/auth/change-password'; let passed = false;
    await protect(req, response(), () => { passed = true; }); assert.ok(passed);
  } finally { db.query = original; }
});
