window.Peacee1Captcha=(()=>{
 let widget,enabled=false,token='',ready,pending,verifiedUntil=0;
 async function init(){
  const response=await fetch('/api/auth/captcha-config',{credentials:'same-origin'});
  if(!response.ok)throw Error('Unable to load security verification');
  const config=await response.json();enabled=config.enabled;if(!enabled)return;
  if(!config.siteKey)throw Error('Security verification is not ready');
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=()=>reject(Error('Unable to load CAPTCHA'));document.head.appendChild(script);});
  const action=location.pathname==='/register'?'register':location.pathname==='/login'?'login':'recovery';
  const form=document.getElementById('auth-form')||document.getElementById('request-form');
  const container=document.createElement('div');container.className='captcha-container';form.insertBefore(container,form.querySelector('button[type="submit"],button.submit'));
  widget=turnstile.render(container,{sitekey:config.siteKey,action,size:'flexible',theme:'dark',language:'en',execution:'execute',appearance:'execute',callback:value=>{token=value;if(pending){clearTimeout(pending.timer);pending.resolve(value);pending=undefined;}},'expired-callback':()=>{token='';},'error-callback':()=>{token='';if(pending){clearTimeout(pending.timer);pending.reject(Error('Security verification failed. Please try again'));pending=undefined;}}});
 }
 ready=init();ready.catch(()=>{});
 return {accepted(response){verifiedUntil=Number(response.headers.get('X-Captcha-Verified-Until'))||0;if(verifiedUntil>Date.now())return;this.reset();},async get(){await ready;if(!enabled||verifiedUntil>Date.now())return '';if(token)return token;if(pending)return pending.promise;const promise=new Promise((resolve,reject)=>{pending={resolve,reject};pending.timer=setTimeout(()=>{pending=undefined;turnstile.reset(widget);reject(Error('Security verification timed out. Please try again'));},120000);});pending.promise=promise;turnstile.execute(widget);return promise;},reset(){token='';verifiedUntil=0;if(widget!==undefined)turnstile.reset(widget);}};
})();
