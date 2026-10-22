const {test}=require('node:test'),assert=require('node:assert/strict');
const {planFleet,selectAssignmentBin,encrypt,decrypt}=require('../utils/rokFleet');const {validateConfig,DEFAULT_CONFIG}=require('../utils/rokConfig');
const a=(id,n)=>({id,governors:Array.from({length:n},(_,i)=>({id:String(i),name:'F'+i}))});
test('new discovery and reimport favor idle worker instead of busy packed worker',()=>{
 const bins=[{id:'busy',status:'running',load:11,accountCount:2,unknown:false},{id:'idle',status:'idle',load:0,accountCount:0,unknown:false}];
 for(const count of [0,6])assert.equal(selectAssignmentBin({...a(16,count),status:'pending_login'},bins).id,'idle');
 assert.equal(selectAssignmentBin({...a(17,6),status:'ready'},bins).id,'busy');
});
test('discovery respects capacity and unknown-roster reservation',()=>{
 const bins=[{id:'reserved',status:'idle',load:0,accountCount:1,unknown:true},{id:'full',status:'idle',load:30,accountCount:2,unknown:false}];
 assert.equal(selectAssignmentBin({...a(16,0),status:'pending_login'},bins),null);
 assert.equal(selectAssignmentBin({...a(17,31),status:'pending_login'},bins),null);
});
test('discovery chooses empty worker among idle workers',()=>{
 const bins=[{id:'packed',status:'idle',load:11,accountCount:2,unknown:false},{id:'empty',status:'idle',load:0,accountCount:0,unknown:false}];
 assert.equal(selectAssignmentBin({...a(16,0),status:'pending_login'},bins).id,'empty');
});
test('whole-account packing fits 6+6+8 into one VPS',()=>{const p=planFleet([a(1,6),a(2,6),a(3,8)],[{id:'one'},{id:'two'}]);assert.equal(p.bins[0].load,20);assert.equal(p.bins[0].accounts.length,3);assert.equal(p.bins[1].load,0);assert.deepEqual(p.waiting,[]);});
test('packing never splits accounts or exceeds 30',()=>{const p=planFleet([a(1,18),a(2,18),a(3,13)],[{id:'one'},{id:'two'}]);assert.ok(p.bins.every(b=>b.load<=30));assert.deepEqual(p.waiting,[3]);assert.equal(p.bins.flatMap(b=>b.accounts).length,2);});
test('unknown rosters and oversized account stay waiting',()=>{assert.deepEqual(planFleet([a(1,0),a(2,31)],[{id:'one'}]).waiting,[2,1]);});
test('configuration validates limits and rejects unexpected properties',()=>{assert.equal(validateConfig(DEFAULT_CONFIG),true);for(const c of [{...DEFAULT_CONFIG,repeatHours:0},{...DEFAULT_CONFIG,level:9},{...DEFAULT_CONFIG,password:'secret'},{...DEFAULT_CONFIG,allocations:{food:7,wood:7,stone:0,gold:0}}])assert.equal(validateConfig(c),false);});
test('credentials encrypt and detect tampering; no key cannot accept secrets',()=>{process.env.ROKBOT_ENCRYPTION_KEY='a'.repeat(64);const value=encrypt({password:'private-pass'});assert.ok(!value.includes('private-pass'));assert.deepEqual(decrypt(value),{password:'private-pass'});const parts=value.split('.');parts[2]=Buffer.from('tampered').toString('base64');assert.throws(()=>decrypt(parts.join('.')));delete process.env.ROKBOT_ENCRYPTION_KEY;assert.throws(()=>encrypt({password:'x'}));});
