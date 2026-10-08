(() => {
 const params=new URLSearchParams(location.search);
 function destination(){try{const value=new URL(params.get('returnTo')||'/',location.origin);if(value.username||value.password||value.protocol!=='https:'||!['peacee1.io.vn','www.peacee1.io.vn','finance.peacee1.io.vn','salesmanager.peacee1.io.vn','tasks.peacee1.io.vn','boardgame.peacee1.io.vn','beatmaker.peacee1.io.vn'].includes(value.host))return '/';if(value.origin===location.origin&&['/login','/register'].includes(value.pathname))return '/';return value.href;}catch{return '/';}}
 const target=destination(),register=location.pathname==='/register';
 document.getElementById('email').type=register?'email':'text';document.querySelector('label[for=email]').textContent=register?'Email':'Email hoặc tài khoản nhân viên';
 document.title=register?'Đăng ký — Peacee1':'Đăng nhập — Peacee1';
 const $=id=>document.getElementById(id),form=$('auth-form'),submit=$('submit');
 $('name-row').hidden=!register;$('confirm-row').hidden=!register;$('name').required=register;$('confirm').required=register;
 $('password').autocomplete=register?'new-password':'current-password';
 $('title').textContent=register?'Tạo tài khoản Peacee1':'Chào bạn quay lại';
 $('subtitle').textContent=register?'Một tài khoản cho tất cả ứng dụng Peacee1.':'Đăng nhập bằng tài khoản Peacee1 của bạn.';
 submit.textContent=register?'Tạo tài khoản':'Đăng nhập';
 $('switch-label').textContent=register?'Đã có tài khoản?':'Chưa có tài khoản?';
 $('switch').textContent=register?'Đăng nhập':'Tạo tài khoản';$('switch').href=`/${register?'login':'register'}?returnTo=${encodeURIComponent(target)}`;
 $('show-password').onclick=()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').textContent=show?'Ẩn':'Hiện';$('show-password').setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');};
 const messages={'Thong tin dang nhap khong dung.':'Email hoặc mật khẩu không đúng.','Vui long nhap day du thong tin.':'Vui lòng nhập đầy đủ thông tin.','Loi server.':'Không thể đăng nhập lúc này. Vui lòng thử lại.'};
 async function request(path,body){const response=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,captchaToken:await Peacee1Captcha.get()})});const result=await response.json();Peacee1Captcha.accepted(response);if(!response.ok)throw Object.assign(Error(messages[result.message]||result.message||'Không thể thực hiện yêu cầu.'),{code:result.code});return result;}
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled)return;$('error').hidden=true;const password=$('password').value;if(register&&password!==$('confirm').value){$('error').textContent='Mật khẩu xác nhận chưa khớp.';$('error').hidden=false;return;}submit.disabled=true;submit.textContent='Đang xử lý…';try{const body={email:$('email').value.trim(),password,loginType:register||$('email').value.includes('@')?'owner':'employee'};if(register){await request('register',{...body,name:$('name').value.trim()});location.replace('/login?returnTo='+encodeURIComponent(target));return;}await request('login',body);$('password').value='';$('confirm').value='';location.replace(target);}catch(error){if(error.code==='EMAIL_VERIFICATION_REQUIRED'){sessionStorage.setItem('peacee1-verification-email',$('email').value.trim());location.assign('/recover.html?mode=verify');return;}$('error').textContent=error.message||'Không kết nối được máy chủ.';$('error').hidden=false;submit.disabled=false;submit.textContent=register?'Tạo tài khoản':'Đăng nhập';}};
 fetch('/api/auth/session',{credentials:'same-origin'}).then(response=>{if(response.ok)location.replace(target);}).catch(()=>{});
})();
