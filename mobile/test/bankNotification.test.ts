import test from 'node:test';
import assert from 'node:assert/strict';
import {bankExpenseDraft} from '../src/bankNotification.ts';
test('extracts debit amount without reading account numbers and available balance',()=>{
 assert.equal(bankExpenseDraft('TK 0123456789 GD -85,000 VND. So du 10,000,000 VND').amount,'85000');
 assert.equal(bankExpenseDraft('Thanh toán 1.000.000 ₫ tại cửa hàng').amount,'1000000');
 assert.equal(bankExpenseDraft('Paid 53000 VND').amount,'53000');
});
test('ambiguous amounts, balances and unsupported currencies need manual confirmation',()=>{
 assert.equal(bankExpenseDraft('Số dư 1.000.000 VND').amount,'');
 assert.equal(bankExpenseDraft('Paid 100000 VND. Payment 200000 VND.').amount,'');
 assert.equal(bankExpenseDraft('Paid 12.50 USD').amount,'');
 assert.equal(bankExpenseDraft('Paid 9007199254740992 VND').amount,'');
});
