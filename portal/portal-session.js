(() => {
 const account=document.getElementById('account');
 fetch('/api/auth/session',{credentials:'same-origin'}).then(async response=>{
  if(!response.ok)return;
  const {user}=await response.json();
  account.replaceChildren();
  const name=document.createElement('a');name.textContent=user.name;name.title='Quản lý tài khoản';name.href='/account.html';account.append(name);
  const logout=document.createElement('button');logout.type='button';logout.textContent='Đăng xuất';account.append(logout);
  logout.onclick=async()=>{logout.disabled=true;try{const result=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});if(!result.ok)throw Error();location.reload();}catch{logout.disabled=false;logout.textContent='Thử lại đăng xuất';}};
  const join=document.getElementById('universe-join');if(join)join.href='/account.html';

 }).catch(()=>{});
})();
