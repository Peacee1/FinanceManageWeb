const {test}=require('node:test'),assert=require('node:assert/strict');
const {active,requireSlot}=require('../utils/rokLicense');
test('license boundary and missing license deny farming',async()=>{
 assert.equal(active(null),false);assert.equal(active({expires_at:new Date(1000)},1000),false);assert.equal(active({expires_at:new Date(1001)},1000),true);
 await assert.rejects(requireSlot({query:async()=>({rows:[]})},7,false),e=>e.status===403);
});
test('capacity counts enabled governors across ROK accounts, existing governor can continue',async()=>{
 const c={query:async sql=>({rows:sql.includes('rokbot_licenses')?[{capacity:6,expires_at:new Date(Date.now()+86400000)}]:[{governors:Array.from({length:4},()=>({enabled:true}))},{governors:[{enabled:true},{enabled:true},{enabled:false}]}]})};
 await assert.rejects(requireSlot(c,7,false),e=>e.status===403);await requireSlot(c,7,true);
});
