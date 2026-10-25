(() => {
 const params=new URLSearchParams(location.search);
 function destination(){try{const value=new URL(params.get('returnTo')||'/',location.origin);if(value.username||value.password||value.protocol!=='https:'||!['peacee1.io.vn','www.peacee1.io.vn','finance.peacee1.io.vn','salesmanager.peacee1.io.vn','tasks.peacee1.io.vn','boardgame.peacee1.io.vn','beatmaker.peacee1.io.vn','rokbot.peacee1.io.vn'].includes(value.host))return '/';if(value.origin===location.origin&&['/login','/register'].includes(value.pathname))return '/';return value.href;}catch{return '/';}}
 const target=destination(),register=location.pathname==='/register';
 document.getElementById('email').type=register?'email':'text';document.querySelector('label[for=email]').textContent=register?'Email':'Email or employee username';
 document.title=register?'Sign up — Peacee1':'Sign in — Peacee1';
 const $=id=>document.getElementById(id),form=$('auth-form'),submit=$('submit');
 $('name-row').hidden=!register;$('confirm-row').hidden=!register;$('name').required=register;$('confirm').required=register;
 $('password').autocomplete=register?'new-password':'current-password';
 $('title').textContent=register?'Create your Peacee1 account':'Welcome back';
 $('subtitle').textContent=register?'One account for the entire Peacee1 ecosystem':'Continue your journey in the Peacee1 universe';
 submit.textContent=register?'Create account':'Sign in';
 $('switch-label').textContent=register?'Already have an account?':'New to Peacee1?';
 $('switch').textContent=register?'Sign in':'Create account';$('switch').href=`/${register?'login':'register'}?returnTo=${encodeURIComponent(target)}`;
 $('show-password').onclick=()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').textContent=show?'Hide':'Show';$('show-password').setAttribute('aria-label',show?'Hide password':'Show password');};
 const socialErrors={unavailable:'Social sign-in is not available yet. Please use your email and password',invalid_state:'Your session has expired. Please try again',cancelled:'Sign-in was cancelled',missing_email:'Sign-in details are incomplete. Please try again',unverified_email:'Your Google email has not been verified',email_exists:'This email already has a Peacee1 account. Sign in with your password to link it',inactive:'This account has been disabled',already_linked:'This social profile is already linked to another account',link_login:'Sign in to Peacee1 before linking your account',provider_failed:'Unable to sign in with this provider. Please try again'};
 if(params.has('socialError')){$('error').textContent=socialErrors[params.get('socialError')]||socialErrors.provider_failed;$('error').hidden=false;}
 for(const provider of ['google','facebook'])$(provider+'-login').onclick=e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();};
 fetch('/api/auth/oauth/providers',{credentials:'same-origin',headers:{'Accept-Language':'en'}}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{for(const provider of ['google','facebook']){const button=$(provider+'-login');if(data[provider]){button.removeAttribute('aria-disabled');button.href='/api/auth/oauth/'+provider+'/start?returnTo='+encodeURIComponent(target);}}if(!data.google&&!data.facebook)$('social-help').textContent='Social sign-in is coming soon. Use your email and password to continue';}).catch(()=>{$('social-help').textContent='Social sign-in is unavailable. Please use your email and password';});
 const messages={'Thong tin dang nhap khong dung.':'Incorrect email or password','Vui long nhap day du thong tin.':'Please complete all required fields','Loi server.':'Unable to sign in right now. Please try again'};
 async function request(path,body){const response=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept-Language':'en'},body:JSON.stringify({...body,captchaToken:await Peacee1Captcha.get()})});const result=await response.json();Peacee1Captcha.accepted(response);if(!response.ok)throw Object.assign(Error(messages[result.message]||result.message||'Unable to complete your request'),{code:result.code});return result;}
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;$('error').hidden=true;const password=$('password').value;if(register&&password!==$('confirm').value){$('error').textContent='The passwords do not match';$('error').hidden=false;return;}submit.disabled=true;submit.textContent='Please wait…';try{const body={email:$('email').value.trim(),password,loginType:register||$('email').value.includes('@')?'owner':'employee'};if(register){await request('register',{...body,name:$('name').value.trim()});location.replace('/login?returnTo='+encodeURIComponent(target));return;}await request('login',body);$('password').value='';$('confirm').value='';location.replace(target);}catch(error){if(error.code==='EMAIL_VERIFICATION_REQUIRED'){sessionStorage.setItem('peacee1-verification-email',$('email').value.trim());location.assign('/recover.html?mode=verify');return;}$('error').textContent=error.message||'Unable to connect. Please try again';$('error').hidden=false;submit.disabled=false;submit.textContent=register?'Create account':'Sign in';}};
 fetch('/api/auth/session',{credentials:'same-origin',headers:{'Accept-Language':'en'}}).then(response=>{if(response.ok)location.replace(target);}).catch(()=>{});
})();

// Run the decorative orbit independently of authentication and form state.
(() => {
 const world=document.querySelector('.auth-cosmos'),moon=world?.querySelector('.auth-moon');
 if(!world||!moon)return;
 let frame=0,origin=performance.now(),elapsed=0;
 const render=now=>{
  elapsed=now-origin;
  const angle=elapsed*Math.PI*2/30000+2.5;
  const x=Math.cos(angle)*.5,y=Math.sin(angle)*.5;
  // Match the ring's -28 degree tilt, using a dimensionless ellipse.
  const tilt=-28*Math.PI/180,rx=x,ry=y*.2833;
  const px=rx*Math.cos(tilt)-ry*Math.sin(tilt),py=rx*Math.sin(tilt)+ry*Math.cos(tilt);
  moon.style.transform=`translate(-50%,-50%) translate3d(${px*world.clientWidth}px,${py*world.clientWidth}px,0) scale(${.88+Math.sin(angle)*.12})`;
  moon.style.zIndex=Math.sin(angle)>0?'3':'0';
  frame=requestAnimationFrame(render);
 };
 const resume=()=>{cancelAnimationFrame(frame);if(!document.hidden){origin=performance.now()-elapsed;frame=requestAnimationFrame(render);}};
 document.addEventListener('visibilitychange',resume);resume();
})();
