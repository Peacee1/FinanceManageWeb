(() => {
 const account=document.getElementById('account');
 fetch('/api/auth/session',{credentials:'same-origin',headers:{'Accept-Language':'en'}}).then(async response=>{
  if(!response.ok)return;
  const {user}=await response.json();
  account.replaceChildren();
  const name=document.createElement('a');name.textContent=user.name;name.title='Manage account';name.href='/account.html';account.append(name);
  const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';account.append(logout);
  logout.onclick=async()=>{logout.disabled=true;try{const result=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Accept-Language':'en'}});if(!result.ok)throw Error();location.reload();}catch{logout.disabled=false;logout.textContent='Retry sign out';}};
  const join=document.getElementById('universe-join');if(join)join.href='/account.html';

 }).catch(()=>{});
})();
