const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transactionError } = require('../utils/validation');
test('locations accept valid coordinates and removal; reject malformed or injected values', () => {
  for (const location of [null,{lat:0,lng:0},{lat:-90,lng:180,label:'Test'}]) assert.equal(transactionError({location},true),null);
  for (const location of [{lat:91,lng:0},{lat:0,lng:181},{lat:'10',lng:1},{lat:NaN,lng:0},{lat:0,lng:Infinity},{lat:0,lng:0,label:'a'.repeat(201)},[],{}, {lat:0,lng:0,secret:'unexpected'}]) assert.equal(transactionError({location},true),'Vị trí không hợp lệ.');
});
