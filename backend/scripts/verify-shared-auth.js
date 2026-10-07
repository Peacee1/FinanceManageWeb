require('dotenv').config();
const {randomBytes}=require('crypto');
const db=require('../config/db');
const origin='https://peacee1.io.vn',finance='https://finance.peacee1.io.vn';
const email='sso-fixture-'+randomBytes(12).toString('hex')+'@example.invalid';
const password='SsoTest!1'+randomBytes(16).toString('hex');
function check(ok,message){if(!ok)throw Error(message);}
(async()=>{try{
 const registered=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'SSO temporary fixture',email,password})});
 check(registered.status===201,'Registration failed');const created=await registered.json();
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password,loginType:'owner'})});check(login.ok,'Central login failed');
 const header=login.headers.get('set-cookie');check(header&&header.includes('HttpOnly')&&header.includes('Secure')&&header.includes('Domain=.peacee1.io.vn'),'Invalid session cookie');const cookie=header.split(';')[0];
 for(const host of [origin,finance]){const response=await fetch(host+'/api/auth/session',{headers:{Cookie:cookie}});check(response.ok,'Session not shared');const result=await response.json();check(result.user.id===created.user.id&&!result.token,'Wrong shared identity');}
 const bootstrap=await fetch(finance+'/api/users/bootstrap?month=2026-10',{headers:{Cookie:cookie}});check(bootstrap.ok,'Finance bootstrap failed');const data=await bootstrap.json();check(data.entries.length===7,'Missing finance resources');
 const rejected=await fetch(finance+'/api/users/settings',{method:'POST',headers:{Cookie:cookie,Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({currency:'USD'})});check(rejected.status===403,'Cross-origin mutation accepted');
 const logout=await fetch(finance+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:finance}});check(logout.ok,'Shared logout failed');const cleared=logout.headers.get('set-cookie').split(';')[0];check((await fetch(origin+'/api/auth/session',{headers:{Cookie:cleared}})).status===401,'Session did not clear');
 console.log(JSON.stringify({registration:true,centralLogin:true,sharedIdentity:true,financeBootstrap:true,csrfBlocked:true,sharedLogout:true}));
}finally{await db.query('DELETE FROM users WHERE email=$1',[email]);}})().catch(error=>{console.error({message:error.message,code:error.code});process.exitCode=1;}).finally(()=>db.close());
