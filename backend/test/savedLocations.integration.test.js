const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('crypto');
const db=require('../config/db');
const places=require('../controllers/savedLocationController');
after(()=>db.close());
const invoke=async(handler,userId,body={},params={})=>{
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
  await handler({user:{userId},body,params},res,error=>{throw error;});return res;
};
test('saved locations validate coordinates, reuse names and isolate accounts',{skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
  const ids=[];
  try {
    for(let i=0;i<2;i++) ids.push((await db.query("INSERT INTO users(name,email,password_hash) VALUES('Map test',$1,'test') RETURNING id",[`${randomUUID()}@example.invalid`])).rows[0].id);
    assert.equal((await invoke(places.save,ids[0],{name:' ',lat:21,lng:105})).statusCode,400);
    assert.equal((await invoke(places.save,ids[0],{name:'Home',lat:91,lng:105})).statusCode,400);
    const first=await invoke(places.save,ids[0],{name:' Nhà riêng ',lat:20.97,lng:105.77});
    const second=await invoke(places.save,ids[0],{name:'Nhà riêng',lat:20.98,lng:105.78});
    assert.equal(first.body.id,second.body.id);
    assert.equal((await invoke(places.list,ids[0])).body.length,1);
    assert.equal((await invoke(places.list,ids[0])).body[0].lat,20.98);
    assert.equal((await invoke(places.list,ids[1])).body.length,0);
    assert.equal((await invoke(places.remove,ids[1],{},{id:String(first.body.id)})).statusCode,404);
    assert.equal((await invoke(places.remove,ids[0],{},{id:String(first.body.id)})).statusCode,200);
    assert.equal((await invoke(places.list,ids[0])).body.length,0);
  } finally {await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);}
});
