const {test}=require('node:test'),assert=require('node:assert/strict');
const {validResources,mergeResources}=require('../utils/rokResources');
test('all four balances required, no negatives or untrusted extra fields',()=>{const r={food:20200000,wood:22300000,stone:19000000,gold:8800000};assert.ok(validResources(r));for(const v of [null,{}, {...r,gold:-1},{...r,wood:NaN},{...r,gold:'8.8M'},{...r,extra:1}])assert.equal(validResources(v),false);});
test('failed OCR retains earlier snapshot; valid zero is stored with server time',()=>{const g={resources:{food:1}};mergeResources(g,undefined);assert.deepEqual(g.resources,{food:1});mergeResources(g,{food:0,wood:0,stone:0,gold:0},0);assert.equal(g.resources.food,0);assert.equal(g.resources_updated_at,'1970-01-01T00:00:00.000Z');});
