const { test } = require('node:test');
const assert = require('node:assert/strict');
const { vietnamDate } = require('../utils/businessDate');
test('POS date follows Vietnam midnight and month/year boundaries', () => {
  assert.equal(vietnamDate(new Date('2026-09-30T16:59:59Z')), '2026-09-30');
  assert.equal(vietnamDate(new Date('2026-09-30T17:00:00Z')), '2026-10-01');
  assert.equal(vietnamDate(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
});
