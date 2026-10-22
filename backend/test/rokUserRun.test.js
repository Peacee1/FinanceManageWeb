const {test}=require('node:test'),assert=require('node:assert/strict'),{setUserRun}=require('../utils/rokUserRun');
test('one user run enables both registered accounts, keeps finished governor next time, stops all',async()=>{
 const accounts=[{id:'1',governors:[{id:'old',enabled:true,state:'waiting',next_at:12345}]},{id:'2',governors:Array.from({length:5},(_,i)=>({id:'new'+i,enabled:false}))}];let capacity=6,autoRun;const deleted=[];
 const c={query:async(sql,p)=>{if(sql.includes('SELECT capacity'))return {rows:[{capacity,expires_at:new Date(Date.now()+86400000)}]};if(sql.startsWith('SELECT id,governors'))return {rows:accounts};if(sql.startsWith('DELETE FROM'))deleted.push(p[0]);if(sql.startsWith('UPDATE rokbot_licenses'))autoRun=p[0];return {rows:[]};}};
 await setUserRun(c,99,true);assert.ok(accounts.every(a=>a.governors.every(g=>g.enabled)));assert.deepEqual(deleted,['2']);assert.equal(accounts[0].governors[0].next_at,12345);assert.equal(autoRun,true);
 await setUserRun(c,99,false);assert.ok(accounts.every(a=>a.governors.every(g=>!g.enabled)));assert.equal(autoRun,false);
 capacity=5;await assert.rejects(setUserRun(c,99,true),e=>e.status===403);assert.ok(accounts.every(a=>a.governors.every(g=>!g.enabled)));
});
