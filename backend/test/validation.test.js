const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transactionError, isPassword, isDate } = require('../utils/validation');
const valid = { type: 'EXPENSE', amount: '100000', category: 'Ăn uống', date: '2026-10-01' };
test('accepts integer VND and rejects invalid financial input', () => {
  assert.equal(transactionError(valid), null);
  for (const amount of [-1, 0, 1.5, true, '1e3', '9007199254740992']) assert.ok(transactionError({ ...valid, amount }));
  assert.ok(transactionError({ ...valid, type: 'TRANSFER' }));
  assert.ok(transactionError({ ...valid, category: ' ' }));
  assert.ok(transactionError({ ...valid, description: 'x'.repeat(2001) }));
});
test('validates real calendar dates and partial edits', () => {
  assert.equal(isDate('2026-02-29'), false);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(transactionError({ amount: 2000 }, true), null);
  assert.ok(transactionError({ date: null }, true));
});
test('passwords respect complexity and bcrypt byte limit', () => {
  assert.equal(isPassword('1'), false);
  assert.equal(isPassword('Abcdef1!'), true);
  assert.equal(isPassword('A1!' + 'é'.repeat(40)), false);
});
