const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateTableFee } = require('../utils/tableBilling');
test('table fees use integer VND, elapsed time and explicit minute/hour rounding', () => {
  const start = '2026-10-01T01:00:00Z';
  assert.deepEqual(calculateTableFee(start, '2026-10-01T01:00:01Z', 5000, 'MINUTE'), { units: 1, amount: 84 });
  assert.deepEqual(calculateTableFee(start, '2026-10-01T01:30:00Z', 5000, 'MINUTE'), { units: 30, amount: 2500 });
  assert.deepEqual(calculateTableFee(start, '2026-10-01T01:30:00Z', 15000, 'MINUTE'), { units: 30, amount: 7500 });
  assert.deepEqual(calculateTableFee(start, '2026-10-01T02:00:00Z', 5000, 'MINUTE'), { units: 60, amount: 5000 });
  assert.deepEqual(calculateTableFee(start, '2026-10-01T02:00:01Z', 5000, 'HOUR'), { units: 2, amount: 10000 });
  assert.throws(() => calculateTableFee(start, '2026-10-01T00:00:00Z', 5000, 'MINUTE'));
});
