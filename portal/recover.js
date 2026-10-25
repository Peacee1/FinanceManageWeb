(()=>{const $=id=>document.getElementById(id);let resetToken,verifyEmail=new URLSearchParams(location.search).get('mode')==='verify';
 if(verifyEmail){$('recovery-title').textContent='Verify email';$('recovery-description').textContent='Verify your email to finish setting up your Peacee1 account';$('new-password-fields').hidden=true;$('new-password').required=false;$('confirm-password').required=false;$('verify').textContent='Verify email';document.title='Verify email — Peacee1';}
 $('email').value=sessionStorage.getItem('peacee1-verification-email')||'';sessionStorage.removeItem('peacee1-verification-email');
 const cooldownKey=()=> 'peacee1-code-'+(verifyEmail?'email':'reset')+':'+$('email').value.trim().toLowerCase();
 function tick(){const left=Math.max(0,Math.ceil((Number(localStorage.getItem(cooldownKey()))-Date.now())/1000));$('send').disabled=left>0;$('send').textContent=left?'Resend in '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0'):'Send email code';}
 setInterval(tick,1000);$('email').addEventListener('input',tick);tick();
 async function request(path,body){if(path==='forgot-password')body.captchaToken=await Peacee1Captcha.get();const response=await fetch('/api/account/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept-Language':'en'},body:JSON.stringify(body)});const result=await response.json();if(path==='forgot-password')Peacee1Captcha.accepted(response);if(!response.ok){if(result.code==='EMAIL_VERIFICATION_REQUIRED'){sessionStorage.setItem('peacee1-verification-email',$('email').value.trim());location.replace('/recover.html?mode=verify&next=reset');}throw Error(result.message||'Unable to complete your request');}if(path==='email/request'||path==='forgot-password'){localStorage.setItem(cooldownKey(),String(Date.now()+(result.retryAfter||300)*1000));tick();}return result;}
 async function run(button,fn){if(button.disabled)return;button.disabled=true;$('message').textContent='Please wait…';try{$('message').textContent=(await fn()).message;}catch(e){$('message').textContent=e.message;}finally{button.disabled=false;tick();}}
 $('request-form').onsubmit=e=>{e.preventDefault();run($('send'),()=>request(verifyEmail?'email/request':'forgot-password',{email:$('email').value.trim()}));};
 $('verify-form').onsubmit=e=>{e.preventDefault();run($('verify'),async()=>{
  if(!verifyEmail&&$('new-password').value!==$('confirm-password').value)throw Error('The passwords do not match');
  const result=await request(verifyEmail?'email/verify':'reset-password',{email:$('email').value.trim(),code:resetToken||$('code').value,newPassword:$('new-password').value,resetAfterVerification:verifyEmail&&new URLSearchParams(location.search).get('next')==='reset'});
  $('code').value='';$('new-password').value='';$('confirm-password').value='';
  if(result.resetToken){
   resetToken=result.resetToken;verifyEmail=false;$('request-form').hidden=true;$('email').readOnly=true;
   $('code').hidden=true;$('code').required=false;document.querySelector('label[for="code"]').hidden=true;
   $('new-password-fields').hidden=false;$('new-password').required=true;$('confirm-password').required=true;
   $('recovery-title').textContent='Set a new password';$('recovery-description').textContent='Email verified. Enter a new password to finish';$('verify').textContent='Save new password';$('new-password').focus();
  }else{resetToken=undefined;$('verify-form').hidden=true;$('request-form').hidden=true;}
  return result;
 });};
})();
