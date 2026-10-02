import React,{useEffect,useState,useRef} from 'react';
import axios from 'axios';
import {Target,Plus,ArrowDownLeft,ArrowUpRight,History,Settings2,X} from 'lucide-react';
import {goalPlan} from './goalPlan.mjs';
import './savingsGoals.css';
const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value||0));
const date=value=>value?new Date(value.slice(0,10)+'T00:00:00').toLocaleDateString('vi-VN'):'';
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
const empty=()=>({name:'',targetAmount:'',initialAmount:'0',deadline:'',monthlyAmount:'',priority:'normal',status:'active',reminder:'none',reminderDay:1,requestId:crypto.randomUUID()});
const config=()=>({headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
const statuses={active:'Đang thực hiện',paused:'Tạm dừng',completed:'Hoàn thành'};
const priorities={high:'Ưu tiên cao',normal:'Bình thường',low:'Ưu tiên thấp'};
function AmountInput({value,onChange,...props}) {return <input {...props} type="text" inputMode="numeric" value={value===''?'':Number(value).toLocaleString('vi-VN')} onChange={event=>onChange(event.target.value.replace(/\D/g,''))}/>;}
export default function SavingsGoals(){
 const [data,setData]=useState({mode:'personal',items:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState(null),[editId,setEditId]=useState(null),[entry,setEntry]=useState(null),[history,setHistory]=useState(null),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false);
 const pending=useRef(false);
 const load=async()=>{const response=await axios.get('/api/users/goals',config());setData(response.data);};
 useEffect(()=>{let live=true;axios.get('/api/users/goals',config()).then(response=>{if(live)setData(response.data);}).catch(()=>{if(live)setError('Không tải được mục tiêu. Hãy thử lại.');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 const perform=async(work)=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(failure){setError(failure.response?.data?.message||'Không thể lưu thay đổi. Hãy thử lại.');}finally{pending.current=false;setBusy(false);}};
 const field=(key,value)=>setForm(current=>({...current,[key]:value,requestId:crypto.randomUUID()}));
 const startEdit=goal=>{setEntry(null);setHistory(null);setError('');setEditId(goal.id);setForm({name:goal.name,targetAmount:String(goal.target_amount),initialAmount:'0',deadline:goal.deadline?.slice(0,10)||'',monthlyAmount:String(goal.monthly_amount),priority:goal.priority,status:goal.status,reminder:goal.reminder,reminderDay:goal.reminder_day});};
 const saveGoal=event=>{event.preventDefault();perform(async()=>{
   const payload={...form,targetAmount:Number(form.targetAmount),initialAmount:Number(form.initialAmount),monthlyAmount:Number(form.monthlyAmount||0),deadline:form.deadline||null,reminderDay:Number(form.reminderDay)};
   const response=editId?await axios.patch(`/api/users/goals/${editId}`,payload,config()):await axios.post('/api/users/goals',payload,config());
   setData(current=>({...current,items:[...current.items.filter(goal=>goal.id!==response.data.id),response.data]}));setForm(null);setEditId(null);setNotice(editId?'Đã cập nhật mục tiêu.':'Đã tạo mục tiêu.');
 });};
 const saveEntry=event=>{event.preventDefault();perform(async()=>{
   const response=await axios.post(`/api/users/goals/${entry.goal.id}/entries`,{kind:entry.kind,amount:Number(entry.amount),note:entry.note,requestId:entry.requestId},config());
   setData(current=>({...current,items:current.items.map(goal=>goal.id===response.data.goal.id?response.data.goal:goal)}));setEntry(null);setHistory(null);setNotice('Đã cập nhật số tiền dành cho mục tiêu.');
 });};
 const showHistory=(goal,more=false)=>perform(async()=>{
   const response=await axios.get(`/api/users/goals/${goal.id}/entries${more?`?before=${history.nextCursor}`:''}`,config());
   setHistory({goal,items:more?[...history.items,...response.data.items]:response.data.items,nextCursor:response.data.nextCursor});setForm(null);setEntry(null);
 });
 const sorted=[...data.items].sort((a,b)=>['high','normal','low'].indexOf(a.priority)-['high','normal','low'].indexOf(b.priority)||b.id-a.id);
 const rows=sorted.filter(goal=>filter==='all'||goal.status===filter);
 const totals=data.items.reduce((sum,goal)=>({current:sum.current+Number(goal.current_amount),active:sum.active+(goal.status==='active'?1:0),completed:sum.completed+(goal.status==='completed'?1:0)}),{current:0,active:0,completed:0});
 return <section className="savings-goals dashboard-scroll">
  <div className="goals-heading"><div><h2>Mục tiêu tiết kiệm{data.mode==='family'?' gia đình':''}</h2><p>Dành tiền cho điều bạn muốn, theo dõi từng lần góp.</p></div><button className="btn-primary" type="button" disabled={busy||loading} onClick={()=>{setForm(empty());setEditId(null);setEntry(null);setHistory(null);setError('');}}><Plus size={18}/>Tạo mục tiêu</button></div>
  {error&&<div className="goals-message error" role="alert">{error}{loading===false&&!data.items.length&&!form&&<button type="button" onClick={()=>perform(async()=>{await load();})}>Thử lại</button>}</div>}
  {notice&&<div className="goals-message" role="status">{notice}</div>}
  {form&&<form className="goal-editor" onSubmit={saveGoal}>
   <div className="goal-section-heading"><h3>{editId?'Chỉnh sửa mục tiêu':'Bạn muốn dành tiền cho điều gì?'}</h3><button type="button" disabled={busy} aria-label="Đóng biểu mẫu mục tiêu" onClick={()=>setForm(null)}><X size={20}/></button></div>
   {!editId&&<div className="goal-presets">{['Mua xe','Du lịch','Quỹ dự phòng','Mua nhà'].map(name=><button type="button" key={name} onClick={()=>field('name',name)}>{name}</button>)}</div>}
   <div className="goal-form-grid">
    <label>Tên mục tiêu<input required maxLength={100} value={form.name} placeholder="Ví dụ: Chuyến đi Đà Nẵng" onChange={event=>field('name',event.target.value)}/></label>
    <label>Số tiền cần (VNĐ)<AmountInput required value={form.targetAmount} onChange={value=>field('targetAmount',value)} placeholder="30.000.000"/></label>
    {!editId&&<label>Đã dành riêng cho mục tiêu (VNĐ)<AmountInput required value={form.initialAmount} onChange={value=>field('initialAmount',value)}/></label>}
    <label>Muốn hoàn thành khi nào? (tùy chọn)<input type="date" min={editId?undefined:today()} value={form.deadline} onChange={event=>field('deadline',event.target.value)}/></label>
    <label>Mức dự định góp mỗi tháng (tùy chọn)<AmountInput value={form.monthlyAmount} onChange={value=>field('monthlyAmount',value)} placeholder="2.000.000"/></label>
    <label>Ưu tiên<select value={form.priority} onChange={event=>field('priority',event.target.value)}>{Object.entries(priorities).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    {editId&&<label>Trạng thái<select value={form.status} onChange={event=>field('status',event.target.value)}>{Object.entries(statuses).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
    <label>Nhắc góp tiền<select value={form.reminder} onChange={event=>{field('reminder',event.target.value);field('reminderDay',1);}}><option value="none">Không nhắc</option><option value="weekly">Hằng tuần</option><option value="monthly">Hằng tháng</option></select></label>
    {form.reminder==='weekly'&&<label>Ngày nhắc<select value={form.reminderDay} onChange={event=>field('reminderDay',Number(event.target.value))}>{['Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy','Chủ nhật'].map((name,index)=><option value={index+1} key={name}>{name}</option>)}</select></label>}
    {form.reminder==='monthly'&&<label>Ngày nhắc trong tháng<input required type="number" min={1} max={31} value={form.reminderDay} onChange={event=>field('reminderDay',Number(event.target.value))}/><small>Tháng thiếu ngày này sẽ nhắc vào ngày cuối tháng.</small></label>}
   </div>
   <p className="goal-help">Chỉ tính tiền bạn đã dành riêng. Góp/rút mục tiêu không ghi thành thu nhập hoặc chi tiêu.{form.reminder!=='none'?' Nhắc trong chuông thông báo từ 7h sáng ngày bạn chọn.':''}</p>
   <button className="btn-primary" disabled={busy}>{busy?'Đang lưu…':editId?'Lưu thay đổi':'Tạo mục tiêu'}</button>
  </form>}
  <div className="goals-summary"><div><small>Tổng tiền đã dành</small><strong>{money(totals.current)}</strong></div><div><small>Đang thực hiện</small><strong>{totals.active} mục tiêu</strong></div><div><small>Đã hoàn thành</small><strong>{totals.completed} mục tiêu</strong></div></div>
  <div className="goals-filter" role="group" aria-label="Lọc mục tiêu">{[['all','Tất cả'],...Object.entries(statuses)].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
  {loading?<p role="status">Đang tải mục tiêu…</p>:!rows.length?<div className="goals-empty"><Target size={36}/><h3>{data.items.length?'Chưa có mục tiêu ở trạng thái này':'Bạn muốn dành tiền cho điều gì?'}</h3><p>{data.items.length?'Chọn trạng thái khác để xem mục tiêu.':'Tạo mục tiêu đầu tiên, chọn số tiền và thời hạn phù hợp với bạn.'}</p></div>:<div className="goal-cards">{rows.map(goal=>{
   const plan=goalPlan(goal);return <article className={`goal-card ${goal.status}`} key={goal.id}>
    <div className="goal-section-heading"><h3>{goal.name}</h3><span className={`goal-status ${goal.status}`}>{statuses[goal.status]}</span></div>
    <div className="goal-meta"><span>{priorities[goal.priority]}</span><span>{goal.deadline?`Hạn: ${date(goal.deadline)}`:'Chưa đặt thời hạn'}</span></div>
    <div className="goal-saved"><strong>{money(goal.current_amount)}</strong><span> / {money(goal.target_amount)}</span></div>
    <div className="goal-progress" role="progressbar" aria-label={`Tiến độ ${goal.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(plan.progress)}><div style={{width:`${plan.progress}%`}}/></div>
    <div className="goal-plan"><strong>{Math.round(plan.progress)}% · Còn {money(plan.remaining)}</strong>
     {plan.remaining>0&&(plan.late?<p className="goal-late">Đã qua thời hạn. Bạn có thể điều chỉnh kế hoạch.</p>:plan.required!==null?<p>Cần dành khoảng <b>{money(plan.required)}/tháng</b>{plan.days===0?' · Hạn hôm nay':` · còn ${plan.months} tháng`}.{Number(goal.monthly_amount)>0&&Number(goal.monthly_amount)<plan.required?' Mức góp dự định thấp hơn mức cần để kịp hạn.':''}</p>:plan.estimatedMonths!==null?<p>Với {money(goal.monthly_amount)}/tháng, dự kiến cần khoảng <b>{plan.estimatedMonths} tháng</b>.</p>:<p>Thêm thời hạn hoặc mức góp mỗi tháng để xem kế hoạch.</p>)}
     {goal.reminder!=='none'&&<small>Nhắc {goal.reminder==='weekly'?['thứ hai','thứ ba','thứ tư','thứ năm','thứ sáu','thứ bảy','chủ nhật'][goal.reminder_day-1]:`ngày ${goal.reminder_day} hằng tháng`} lúc 7h sáng.</small>}
    </div>
    <div className="goal-actions"><button type="button" disabled={busy||goal.status==='paused'} onClick={()=>{setEntry({goal,kind:'DEPOSIT',amount:'',note:'',requestId:crypto.randomUUID()});setForm(null);setHistory(null);setError('');}}><ArrowDownLeft size={16}/>Góp tiền</button><button type="button" disabled={busy||Number(goal.current_amount)===0} onClick={()=>{setEntry({goal,kind:'WITHDRAW',amount:'',note:'',requestId:crypto.randomUUID()});setForm(null);setHistory(null);setError('');}}><ArrowUpRight size={16}/>Rút tiền</button><button type="button" disabled={busy} onClick={()=>showHistory(goal)}><History size={16}/>Lịch sử</button><button type="button" disabled={busy} onClick={()=>startEdit(goal)}><Settings2 size={16}/>Sửa</button></div>
    {entry?.goal.id===goal.id&&<form className="goal-entry" onSubmit={saveEntry}><h4>{entry.kind==='DEPOSIT'?'Góp tiền':'Rút tiền'} · {goal.name}</h4><label>Số tiền (VNĐ)<AmountInput required autoFocus value={entry.amount} onChange={value=>setEntry(current=>({...current,amount:value,requestId:crypto.randomUUID()}))}/></label><label>Ghi chú (tùy chọn)<input maxLength={500} value={entry.note} onChange={event=>setEntry(current=>({...current,note:event.target.value,requestId:crypto.randomUUID()}))}/></label><div className="goal-actions"><button className="btn-primary" disabled={busy}>Xác nhận {entry.kind==='DEPOSIT'?'góp':'rút'}</button><button type="button" disabled={busy} onClick={()=>setEntry(null)}>Hủy</button></div></form>}
    {history?.goal.id===goal.id&&<div className="goal-history"><div className="goal-section-heading"><h4>Lịch sử dành tiền</h4><button type="button" onClick={()=>setHistory(null)} aria-label="Đóng lịch sử"><X size={18}/></button></div>{!history.items.length?<p>Chưa có lần góp/rút nào.</p>:history.items.map(item=><div className="goal-history-row" key={item.id}><div><strong>{item.kind==='OPENING'?'Số tiền ban đầu':item.kind==='DEPOSIT'?'Góp tiền':'Rút tiền'}</strong><span>{item.actor_name} · {new Date(item.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</span>{item.note&&<small>{item.note}</small>}</div><b className={item.kind==='WITHDRAW'?'withdraw':'deposit'}>{item.kind==='WITHDRAW'?'-':'+'}{money(item.amount)}</b></div>)}{history.nextCursor&&<button type="button" disabled={busy} onClick={()=>showHistory(goal,true)}>Xem thêm</button>}</div>}
   </article>;
  })}</div>}
 </section>;
}
