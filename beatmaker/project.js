let projectRevision=0,projectLoaded=false,isDirty=false;
const editor=document.querySelector('main');
editor.inert=true;
function projectChanged(){if(!projectLoaded)return;isDirty=true;$('save-state').textContent='Có thay đổi chưa lưu';}
window.projectChanged=projectChanged;
editor.addEventListener('input',projectChanged);editor.addEventListener('change',projectChanged);editor.addEventListener('click',event=>{if(event.target.closest('.step,.mute,#clear,#preset'))projectChanged();});
function readProject(){return{name:$('project-name').value.trim()||'Beat của tôi',bpm:bpm(),swing:Number($('swing').value),master:Number($('master').value),tracks:tracks.map(({steps,volume,mute})=>({steps:[...steps],volume,mute})),melody:Melody.read()};}
function restoreProject(project){$('project-name').value=project.name;$('bpm').value=project.bpm;$('swing').value=project.swing;$('swingval').value=project.swing+'%';$('master').value=project.master;$('masterval').value=project.master+'%';project.tracks.forEach((track,index)=>Object.assign(tracks[index],track));draw();Melody.load(project.melody);}
function login(){pause(true);editor.inert=true;location.replace('https://peacee1.io.vn/login?returnTo='+encodeURIComponent('https://beatmaker.peacee1.io.vn/'));}
async function api(path,options={}){const response=await fetch('/api/'+path,{credentials:'same-origin',...options});if(response.status===401){login();throw Error('Vui lòng đăng nhập.');}const data=await response.json();if(!response.ok)throw Error(data.message||'Không thể kết nối máy chủ.');return data;}
$('save-project').onclick=async()=>{const button=$('save-project');button.disabled=true;try{const project=readProject();const result=await api('beatmaker/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,revision:projectRevision})});projectRevision=result.revision;isDirty=JSON.stringify(project)!==JSON.stringify(readProject());$('save-state').textContent=isDirty?'Có thay đổi chưa lưu':'Đã lưu dự án';status('Dự án đã lưu riêng cho tài khoản của bạn.');}catch(error){$('save-state').textContent='Chưa lưu được';status(error.message);}finally{button.disabled=false;}};
async function loadProject(){try{const session=await api('auth/session');$('account-name').textContent=session.user.name;const data=await api('beatmaker/project');projectRevision=data.revision;if(data.project)restoreProject(data.project);projectLoaded=true;editor.inert=false;$('auth-state').hidden=true;if(!data.project){await $('save-project').onclick();}else $('save-state').textContent='Đã tải dự án của bạn';}catch(error){$('auth-state').textContent=error.message+' Tải lại trang để thử lại.';}}
window.addEventListener('beforeunload',event=>{if(isDirty){event.preventDefault();event.returnValue='';}});
loadProject();
