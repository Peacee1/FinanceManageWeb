const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express'),bcrypt=require('bcrypt');
const db=require('../config/db');
process.env.JWT_SECRET='sso-test-secret-'.repeat(4);
const routes=require('../routes/authRoutes');
const {protect}=require('../middleware/authMiddleware');
test('central login shares an HttpOnly session, rejects forged origins, and logs out across subdomains',async()=>{
 const original=db.query;
 const user={id:1,name:'SSO fixture',email:'sso@example.invalid',role:'owner',plan:'normal',is_active:true,family_id:null,password_hash:await bcrypt.hash('Fixture!123',4)};
 db.query=async()=>({rows:[user]});
 const app=express();app.use(express.json());app.use('/api/auth',routes);app.post('/write',protect,(req,res)=>res.json({id:req.user.userId}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const logged=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://peacee1.io.vn','Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'Fixture!123'})});
  assert.equal(logged.status,200);const header=logged.headers.get('set-cookie');
  assert.match(header,/HttpOnly/);assert.match(header,/Secure/);assert.match(header,/SameSite=Lax/);assert.match(header,/Domain=\.peacee1\.io\.vn/);
  const Cookie=header.split(';')[0];
  const session=await fetch(base+'/api/auth/session',{headers:{Cookie}});assert.equal(session.status,200);const data=await session.json();assert.equal(data.user.id,1);assert.equal(data.token,undefined);assert.equal(data.user.password_hash,undefined);
  assert.equal((await fetch(base+'/write',{method:'POST',headers:{Cookie,Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+'/write',{method:'POST',headers:{Cookie,Origin:'https://finance.peacee1.io.vn'}})).status,200);
  assert.equal((await fetch(base+'/api/auth/session',{headers:{Cookie:'peacee1_session=forged'}})).status,401);
  const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie,Origin:'https://finance.peacee1.io.vn'}});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/peacee1_session=;/);assert.match(logout.headers.get('set-cookie'),/Domain=\.peacee1\.io\.vn/);
 }finally{db.query=original;await new Promise(resolve=>server.close(resolve));await db.close();}
});
