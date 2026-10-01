import { useRef, useState } from 'react';
import axios from 'axios';

export default function TransactionChat({ onCreated }) {
  const [text,setText] = useState('');
  const [messages,setMessages] = useState([]);
  const [busy,setBusy] = useState(false);
  const [pending,setPending] = useState(null);
  const lock = useRef(false);
  const money = amount => Number(amount).toLocaleString('vi-VN') + 'đ';
  const send = async (paymentMethod, useAI = false) => {
    if (lock.current || (!pending && !text.trim())) return;
    const payload = pending || {message:text.trim(),requestId:crypto.randomUUID()};
    lock.current = true; setBusy(true);
    if (!pending) setMessages(current => [...current,{role:'user',text:payload.message}]);
    setPending(payload);
    try {
      const {data} = await axios.post('/api/ai/chat-transaction', {message:payload.message,requestId:payload.requestId,...(payload.draftToken ? {draftToken:payload.draftToken} : {}),...(paymentMethod || payload.paymentMethod ? {paymentMethod:paymentMethod || payload.paymentMethod} : {}),...(useAI ? {useAI:true} : {})}, {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`},timeout:20000});
      if (data.transaction) {
        const tx = data.transaction;
        setMessages(current => [...current,{role:'assistant',text:`Đã ghi ${tx.type === 'INCOME' ? 'thu' : 'chi'} ${money(tx.amount)} · ${tx.category} · ${String(tx.date).slice(0,10)}${tx.payment_method ? ` · ${tx.payment_method === 'CASH' ? 'Tiền mặt' : 'Tài khoản'}` : ''}. Bạn có thể sửa hoặc xoá trong mục Thu chi.`}]);
        setPending(null); setText(''); onCreated();
      } else {
        setMessages(current => [...current,{role:'assistant',text:data.message}]);
        setPending({...payload,retry:false,needsPayment:Boolean(data.needsPayment),needsConfirm:Boolean(data.needsConfirm),draft:data.draft,draftToken:data.draftToken || payload.draftToken,canAskAI:!data.needsPayment && !data.needsConfirm});
      }
    } catch(error) {
      setPending({...payload,...(paymentMethod ? {paymentMethod} : {}),retry:true});
      setMessages(current => [...current,{role:'assistant',text:error.response?.data?.message || 'Chưa xác nhận được kết quả. Bấm thử lại để kiểm tra và ghi, không tạo trùng.'}]);
    } finally { lock.current=false; setBusy(false); }
  };
  return <section className="widget" style={{marginBottom:20}}>
    <h3 style={{marginTop:0}}>Chat ghi thu chi</h3>
    <p style={{color:'var(--color-text-secondary)'}}>Ghi tự động vào thu chi cá nhân, mỗi tin nhắn một khoản. Ví dụ: “nay mua hành 12k”, “nay có lương 20m”.</p>
    <p style={{fontSize:'.85rem',color:'var(--color-text-secondary)'}}>Câu đơn giản được xử lý trực tiếp. Khi bấm nhờ AI, nội dung tin nhắn được gửi tới Gemini để nhận diện; bạn kiểm tra bản nháp trước khi ghi.</p>
    <div role="log" aria-live="polite" aria-label="Lịch sử chat thu chi" style={{maxHeight:280,overflowY:'auto',display:'grid',gap:10,marginBottom:14}}>
      {messages.map((message,index)=><div key={index} style={{padding:12,borderRadius:12,background:message.role==='user'?'var(--promo-bg-2)':'var(--color-bg)',overflowWrap:'anywhere'}}><strong>{message.role==='user'?'Bạn':'Trợ lý'}: </strong>{message.text}</div>)}
    </div>
    <form onSubmit={event=>{event.preventDefault();send();}}>
      <label htmlFor="transaction-chat">Nội dung thu chi</label>
      <textarea id="transaction-chat" value={text} maxLength={500} rows={2} disabled={busy || Boolean(pending)} onChange={event=>setText(event.target.value)} placeholder="nay mua hành 12k tiền mặt" style={{display:'block',width:'100%',padding:12,border:'1px solid var(--color-border)',borderRadius:12,margin:'8px 0 12px',background:'var(--color-card)'}} />
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        {pending?.draft && <p style={{width:'100%',marginTop:0}}>{pending.draft.type==='INCOME'?'Thu':'Chi'} {money(pending.draft.amount)} · {pending.draft.category} · {pending.draft.date}</p>}
        {!pending && <button className="btn-primary" disabled={busy || !text.trim()}>{busy?'Đang ghi…':'Gửi và ghi thu chi'}</button>}
        {pending?.needsPayment && <><button type="button" className="btn-primary" disabled={busy} onClick={()=>send('CASH')}>Tiền mặt</button><button type="button" className="btn-primary" disabled={busy} onClick={()=>send('TRANSFER')}>Tài khoản</button></>}
        {pending?.retry && <button type="button" className="btn-primary" disabled={busy} onClick={()=>send()}>Thử lại</button>}
        {pending?.needsConfirm && <button type="button" className="btn-primary" disabled={busy} onClick={()=>send()}>Xác nhận ghi khoản này</button>}
        {pending?.canAskAI && <button type="button" className="btn-primary" disabled={busy} onClick={()=>send(undefined,true)}>Nhờ AI hiểu câu này</button>}
        {pending && <button type="button" disabled={busy} onClick={()=>{setPending(null);setText('');}}>Tin nhắn mới</button>}
      </div>
      {busy && <p role="status">Đang xử lý…</p>}
    </form>
  </section>;
}
