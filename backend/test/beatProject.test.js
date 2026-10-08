const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const db=require('../config/db');
const {validateProject}=require('../utils/beatProject');
process.env.JWT_SECRET='test-beatmaker-secret-at-least-32-characters';
const project=()=>({name:'My beat',bpm:100,swing:15,master:70,tracks:Array.from({length:6},()=>({steps:Array(16).fill(false),volume:.5,mute:false})),melody:{voice:'triangle',volume:.4,mute:false,notes:[{pitch:69,start:0,length:4}]}});
test('project validation rejects malformed notes, overlap, excess steps and invalid settings',()=>{
 assert.equal(validateProject(project()),true);
 for(const change of [p=>p.bpm=0,p=>p.melody.notes[0].pitch=100,p=>p.melody.notes[0].length=17,p=>p.tracks[0].steps[0]=1,p=>p.melody.voice='invalid',p=>p.melody.notes.push({pitch:69,start:2,length:2}),p=>p.userId=2]){const p=project();change(p);assert.equal(validateProject(p),false);}
});
test('API requires login, isolates ownership and detects stale writes',async()=>{
 const original=db.query,stored=new Map(),projects=new Map();let nextProjectId=1;
 db.query=async(sql,params)=>{
  if(sql.startsWith('SELECT id, role'))return{rows:[{id:params[0],role:'owner',session_version:0,is_active:true}]};
  if(sql.startsWith('INSERT INTO beatmaker_projects')){const id=String(nextProjectId++);const row={id,user_id:params[0],project:JSON.parse(params[1]),revision:1};projects.set(id,row);return{rows:[row]};}
  if(sql.startsWith("SELECT id,project->>"))return{rows:[...projects.values()].filter(p=>p.user_id===params[0]).map(p=>({id:p.id,name:p.project.name,revision:p.revision}))};
  if(sql.startsWith('SELECT id,project,')){const row=projects.get(String(params[0]));return{rows:row?.user_id===params[1]?[row]:[]};}
  if(sql.startsWith('UPDATE beatmaker_projects')){const [json,id,userId,revision]=params;const row=projects.get(String(id));if(!row||row.user_id!==userId||row.revision!==revision)return{rows:[]};row.project=JSON.parse(json);row.revision++;return{rows:[row]};}
  if(sql.startsWith('SELECT project'))return{rows:stored.has(params[0])?[stored.get(params[0])]:[]};
  if(sql.startsWith('INSERT INTO beat_projects')){const [id,json]=params;if(stored.has(id))return{rows:[]};stored.set(id,{project:JSON.parse(json),revision:1});return{rows:[{revision:1}]};}
  if(sql.startsWith('UPDATE beat_projects')){const [json,id,revision]=params;const old=stored.get(id);if(!old||old.revision!==revision)return{rows:[]};stored.set(id,{project:JSON.parse(json),revision:revision+1});return{rows:[{revision:revision+1}]};}
  throw Error('Unexpected query');
 };
 const app=express();app.use(express.json());app.use('/api/beatmaker',require('../routes/beatmakerRoutes'));const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url='http://127.0.0.1:'+server.address().port+'/api/beatmaker/project';
 const token=id=>jwt.sign({userId:id,sv:0},process.env.JWT_SECRET);
 const request=(id,body,extra={})=>fetch(url,{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await fetch(url)).status,401);
  assert.equal((await request(1,{project:project(),revision:0})).status,200);
  const other=await (await request(2)).json();assert.equal(other.project,null);
  assert.equal((await request(2,{project:project(),revision:1,userId:1})).status,409);
  assert.equal((await request(1,{project:project(),revision:0})).status,409);
  assert.equal((await request(1,{project:{},revision:1})).status,400);
  assert.equal((await request(1,{project:project(),revision:1})).status,200);
  const badOrigin=await fetch(url,{method:'PUT',headers:{Cookie:'peacee1_session='+token(1),Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify({project:project(),revision:2})});assert.equal(badOrigin.status,403);
  const sameOrigin=await fetch(url,{method:'PUT',headers:{Cookie:'peacee1_session='+token(1),Origin:'https://beatmaker.peacee1.io.vn','Content-Type':'application/json'},body:JSON.stringify({project:project(),revision:2})});assert.equal(sameOrigin.status,200);
  const callProject=(userId,path='',method='GET',body)=>fetch(url+'s'+path,{method,headers:{Authorization:'Bearer '+token(userId),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const first=await(await callProject(1,'','POST',{project:project()})).json();
  const second=await(await callProject(1,'','POST',{project:{...project(),name:'Second beat'}})).json();
  assert.notEqual(first.id,second.id);assert.equal((await(await callProject(1)).json()).length,2);assert.equal((await(await callProject(2)).json()).length,0);
  assert.equal((await callProject(2,'/'+first.id)).status,404);
  assert.equal((await callProject(2,'/'+first.id,'PUT',{project:project(),revision:1,userId:1})).status,409);
  assert.equal((await callProject(1,'/'+first.id,'PUT',{project:{...project(),name:'Changed'},revision:1})).status,200);
  assert.equal((await callProject(1,'/'+first.id,'PUT',{project:project(),revision:1})).status,409);
  assert.equal((await(await callProject(1,'/'+second.id)).json()).project.name,'Second beat');
  assert.equal((await callProject(1,'/bad-id')).status,400);
 }finally{db.query=original;await new Promise(resolve=>server.close(resolve));}
});
after(()=>db.close());
