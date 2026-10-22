const {test}=require('node:test'),assert=require('node:assert/strict');
const {planCapacity}=require('../utils/rokCapacity');
const a=(id,n)=>({id,governors:Array.from({length:n},()=>({}))});
test('no ready server rejects launch',()=>assert.throws(()=>planCapacity([a(1,6)],[],[]),e=>e.status===503&&e.code==='ROK_CAPACITY_FULL'));
test('packs 6+6+8 governors together',()=>{const p=planCapacity([a(1,6),a(2,6),a(3,8)],[{id:'a'}],[]);assert.equal(p.length,3);assert.ok(p.every(x=>x.agentId==='a'));});
test('full server rejects without reserving partial work',()=>assert.throws(()=>planCapacity([a(2,6)],[{id:'a'}],[{account_id:1,agent_id:'a',size:26}]),e=>e.status===503));
test('keeps existing assignment and excludes its load from new demand',()=>{const p=planCapacity([a(1,6),a(2,8)],[{id:'a'}],[{account_id:1,agent_id:'a',size:6}]);assert.equal(p.length,2);assert.ok(p[0].existing);});
test('offline assignment does not prevent assignment to ready server',()=>assert.equal(planCapacity([a(1,6)],[{id:'b'}],[{account_id:1,agent_id:'a',size:6}])[0].agentId,'b'));
test('account is never split across servers',()=>assert.throws(()=>planCapacity([a(1,12)],[{id:'a'},{id:'b'}],[{account_id:2,agent_id:'a',size:20},{account_id:3,agent_id:'b',size:20}]),e=>e.status===503));

test('one VPS fits exactly 30 and rejects 31 without splitting accounts',()=>{assert.equal(planCapacity([a(1,12),a(2,10),a(3,8)],[{id:'a'}],[]).length,3);assert.throws(()=>planCapacity([a(1,12),a(2,10),a(3,9)],[{id:'a'}],[]),e=>e.status===503);});
