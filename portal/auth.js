(() => {
 const params=new URLSearchParams(location.search);
 function destination(){try{const value=new URL(params.get('returnTo')||'/',location.origin);if(value.username||value.password||value.protocol!=='https:'||!['peacee1.io.vn','www.peacee1.io.vn','finance.peacee1.io.vn','salesmanager.peacee1.io.vn','tasks.peacee1.io.vn','boardgame.peacee1.io.vn','beatmaker.peacee1.io.vn','rokbot.peacee1.io.vn'].includes(value.host))return '/';if(value.origin===location.origin&&['/login','/register'].includes(value.pathname))return '/';return value.href;}catch{return '/';}}
 const target=destination(),register=location.pathname==='/register';
 document.getElementById('email').type=register?'email':'text';document.querySelector('label[for=email]').textContent=register?'Email':'Email hoặc tài khoản nhân viên';
 document.title=register?'Đăng ký — Peacee1':'Đăng nhập — Peacee1';
 const $=id=>document.getElementById(id),form=$('auth-form'),submit=$('submit');
 $('name-row').hidden=!register;$('confirm-row').hidden=!register;$('name').required=register;$('confirm').required=register;
 $('password').autocomplete=register?'new-password':'current-password';
 $('title').textContent=register?'Tạo tài khoản Peacee1':'Chào bạn quay lại';
 $('subtitle').textContent=register?'Một tài khoản cho toàn bộ hệ sinh thái Peacee1':'Tiếp tục hành trình trong vũ trụ Peacee1';
 submit.textContent=register?'Tạo tài khoản':'Đăng nhập';
 $('switch-label').textContent=register?'Đã có tài khoản?':'Chưa có tài khoản?';
 $('switch').textContent=register?'Đăng nhập':'Tạo tài khoản';$('switch').href=`/${register?'login':'register'}?returnTo=${encodeURIComponent(target)}`;
 $('show-password').onclick=()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').textContent=show?'Ẩn':'Hiện';$('show-password').setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');};
 const socialErrors={unavailable:'Đăng nhập nhanh chưa được kích hoạt. Bạn vẫn có thể dùng email và mật khẩu.',invalid_state:'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',cancelled:'Bạn đã hủy đăng nhập.',missing_email:'Thông tin đăng nhập chưa đầy đủ. Vui lòng thử lại.',unverified_email:'Email Google chưa được xác minh.',email_exists:'Email này đã có tài khoản Peacee1. Đăng nhập bằng mật khẩu để liên kết.',inactive:'Tài khoản đã bị khóa.',already_linked:'Tài khoản mạng xã hội đã liên kết với tài khoản khác.',link_login:'Đăng nhập Peacee1 trước khi liên kết tài khoản.',provider_failed:'Chưa thể đăng nhập qua nhà cung cấp. Vui lòng thử lại.'};
 if(params.has('socialError')){$('error').textContent=socialErrors[params.get('socialError')]||socialErrors.provider_failed;$('error').hidden=false;}
 for(const provider of ['google','facebook'])$(provider+'-login').onclick=e=>{if(e.currentTarget.getAttribute('aria-disabled')==='true')e.preventDefault();};
 fetch('/api/auth/oauth/providers',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{for(const provider of ['google','facebook']){const button=$(provider+'-login');if(data[provider]){button.removeAttribute('aria-disabled');button.href='/api/auth/oauth/'+provider+'/start?returnTo='+encodeURIComponent(target);}}if(!data.google&&!data.facebook)$('social-help').textContent='Google và Facebook đang được thiết lập. Bạn có thể dùng email và mật khẩu.';}).catch(()=>{$('social-help').textContent='Đăng nhập nhanh chưa khả dụng. Vui lòng dùng email và mật khẩu.';});
 const messages={'Thong tin dang nhap khong dung.':'Email hoặc mật khẩu không đúng.','Vui long nhap day du thong tin.':'Vui lòng nhập đầy đủ thông tin.','Loi server.':'Không thể đăng nhập lúc này. Vui lòng thử lại.'};
 async function request(path,body){const response=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,captchaToken:await Peacee1Captcha.get()})});const result=await response.json();Peacee1Captcha.accepted(response);if(!response.ok)throw Object.assign(Error(messages[result.message]||result.message||'Không thể thực hiện yêu cầu.'),{code:result.code});return result;}
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;$('error').hidden=true;const password=$('password').value;if(register&&password!==$('confirm').value){$('error').textContent='Mật khẩu xác nhận chưa khớp.';$('error').hidden=false;return;}submit.disabled=true;submit.textContent='Đang xử lý…';try{const body={email:$('email').value.trim(),password,loginType:register||$('email').value.includes('@')?'owner':'employee'};if(register){await request('register',{...body,name:$('name').value.trim()});location.replace('/login?returnTo='+encodeURIComponent(target));return;}await request('login',body);$('password').value='';$('confirm').value='';location.replace(target);}catch(error){if(error.code==='EMAIL_VERIFICATION_REQUIRED'){sessionStorage.setItem('peacee1-verification-email',$('email').value.trim());location.assign('/recover.html?mode=verify');return;}$('error').textContent=error.message||'Không kết nối được máy chủ.';$('error').hidden=false;submit.disabled=false;submit.textContent=register?'Tạo tài khoản':'Đăng nhập';}};
 fetch('/api/auth/session',{credentials:'same-origin'}).then(response=>{if(response.ok)location.replace(target);}).catch(()=>{});
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
