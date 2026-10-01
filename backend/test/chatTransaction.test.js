const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseChatTransaction: parse } = require('../utils/chatTransaction');
const now = new Date('2026-10-01T17:30:00Z');
test('chat extracts integer VND, personal income/expenses, payment method and Vietnam dates',()=>{
  const expense=parse('nay mua hành 12k',now).transaction;
  assert.equal(expense.amount,12000);assert.equal(expense.type,'EXPENSE');assert.equal(expense.category,'Ăn uống');assert.equal(expense.date,'2026-10-02');
  const income=parse('nay có lương 20m chuyển khoản',now).transaction;
  assert.equal(income.amount,20000000);assert.equal(income.type,'INCOME');assert.equal(income.paymentMethod,'TRANSFER');
  assert.equal(parse('hôm qua mua rau 12,5k tiền mặt',now).transaction.date,'2026-10-01');
  assert.equal(parse('mua rau 12000đ ngày 29/09/2026',now).transaction.date,'2026-09-29');
  assert.equal(parse('mua rau 0,001k',now).transaction.amount,1);
});
test('chat refuses ambiguous, hypothetical, multiple and invalid transactions',()=>{
  for(const message of ['định mua hành 12k','chưa mua hành 12k','không mua hành 12k','mua hành 12k?', 'mua hành 12k và rau 15k','lương 20m mua rau 12k','mua rau 0k','mua rau 0,0001k','mua rau 12k ngày 31/09/2026','mai mua rau 12k','mua rau 12k tiền mặt chuyển khoản','mua hành','12k','mua rau 100000000000000000m']) assert.equal(parse(message,now).transaction,undefined,message);
});
