const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stockBalances } = require('../services/inventoryService');
test('recalculates historical stock without allowing negative balances', () => {
  assert.deepEqual(stockBalances([{ id: 1, type: 'IN', quantity: 10 }, { id: 2, type: 'OUT', quantity: 4 }]), [{ id: 1, stockAfter: 10 }, { id: 2, stockAfter: 6 }]);
  assert.throws(() => stockBalances([{ id: 1, type: 'OUT', quantity: 1 }]), { status: 409 });
  assert.throws(() => stockBalances([{ id: 1, type: 'IN', quantity: 2 }, { id: 2, type: 'OUT', quantity: 4 }]), { status: 409 });
  assert.deepEqual(stockBalances([]), []);
});
