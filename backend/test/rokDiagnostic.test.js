const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),db=require('../config/db');
test('diagnostic overwrites one row per client, strips identifiers and bounds image payload',async()=>{
 const old=db.query,calls=[];db.query=async(...args)=>{calls.push(args);return {rows:[]};};
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.agent={id:'agent',name:'VPS'};next();});app.use(require('../routes/rokAgentDiagnosticRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=b=>fetch('http://127.0.0.1:'+server.address().port+'/diagnostic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 const b={version:'fleet-v32',stage:'inside',message:'Lỗi test@example.invalid '+ 'a'.repeat(64),screenshot:'/9j/AAAA'};
 try{
  assert.equal((await call(b)).status,200);assert.equal((await call({...b,message:'second error'})).status,200);
  assert.equal(calls.length,2);assert.ok(calls.every(([sql])=>sql.includes('ON CONFLICT(agent_id) DO UPDATE')&&sql.includes("interval '30 seconds'")));
  assert.equal(calls[0][1][0],'agent');assert.equal(calls[0][1][3],'Lỗi [email] [token]');
  assert.equal((await call({...b,screenshot:'A'.repeat(50001)})).status,400);
  assert.equal((await call({...b,screenshot:'<svg>'})).status,400);
  assert.equal(calls.length,2);
 }finally{await new Promise(r=>server.close(r));db.query=old;}
});
test('manual capture writes only manual screenshot; runtime logs are bounded batches',async()=>{
 const old=db.query,oldTx=db.transaction,calls=[];db.query=async(...args)=>{calls.push(args);return {rows:[]};};db.transaction=fn=>fn({query:db.query});
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.agent={id:'agent',name:'VPS'};next();});app.use(require('../routes/rokAgentDiagnosticRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=(route,b)=>fetch('http://127.0.0.1:'+server.address().port+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 try{
  assert.equal((await call('/capture',{requestId:'00000000-0000-0000-0000-000000000001',screenshot:'/9j/AAAA',message:''})).status,200);
  assert.equal(calls.length,1);assert.ok(calls[0][0].startsWith('UPDATE rokbot_capture'));
  assert.ok(!calls.some(([s])=>s.includes('rokbot_last_error')));
  const line={message:'OCR: Ngoài thành',at:new Date().toISOString()};
  assert.equal((await call('/runtime-logs',{version:'v1',logs:[line]})).status,200);
  assert.ok(calls.some(([s])=>s.includes('LIMIT 200')));
  assert.equal((await call('/runtime-logs',{version:'v1',logs:Array(21).fill(line)})).status,400);
 }finally{await new Promise(r=>server.close(r));db.query=old;db.transaction=oldTx;}
});
