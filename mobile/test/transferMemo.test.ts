import test from 'node:test';
import assert from 'node:assert/strict';
import {transferMemo} from '../src/payments/transferMemo.ts';
test('transfer memo identifies the sender and removes accents and unsafe controls',()=>{
 assert.equal(transferMemo('Do Van A'),'Peacee1 - Do Van A chuyen khoan');
 assert.equal(transferMemo('Nguyễn Văn Đạt'),'Peacee1 - Nguyen Van Dat chuyen khoan');
 assert.equal(transferMemo('  Alice\n  Smith  '),'Peacee1 - Alice Smith chuyen khoan');
 assert.equal(transferMemo('Đỗ "An"'),'Peacee1 - Do An chuyen khoan');
 assert.ok(transferMemo('A'.repeat(200)).length<=140);
});
