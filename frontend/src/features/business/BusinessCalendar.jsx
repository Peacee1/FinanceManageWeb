import React, { useEffect,useState } from 'react';
import axios from 'axios';
import { vietnamDate } from '../../utils/businessDate';
import './BusinessCalendar.css';
const compact = amount => new Intl.NumberFormat('vi-VN',{ notation:'compact',maximumFractionDigits:1 }).format(Number(amount));
const currency = amount => `${Number(amount).toLocaleString('vi-VN')}đ`;
const dateKey = (year,month,day) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export default function BusinessCalendar({ businessId,currentDate,onDateChange }) {
  const year=currentDate.getFullYear(),month=currentDate.getMonth();
  const [days,setDays]=useState([]),[selected,setSelected]=useState(null),[rows,setRows]=useState([]);
  const [cursors,setCursors]=useState(['']),[nextCursor,setNextCursor]=useState(null);
  const [loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const cursor=cursors.at(-1);
  const options = () => ({ headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },timeout:10000 });
  useEffect(() => { setSelected(null); setCursors(['']); },[year,month,businessId]);
  useEffect(() => {
    const controller=new AbortController(); setLoading(true); setError('');
    axios.get('/api/business/calendar',{ ...options(),signal:controller.signal,params:{ businessId,month:month+1,year } }).then(response => setDays(response.data.days)).catch(failure => { if (!axios.isCancel(failure)) setError(failure.response?.data?.message || 'Không thể tải lịch.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[businessId,month,year,revision]);
  useEffect(() => {
    if (!selected) return;
    const controller=new AbortController(); setDetailLoading(true);
    axios.get('/api/transactions',{ ...options(),signal:controller.signal,params:{ scope:'business',businessId,date:selected,approvalStatus:'APPROVED',limit:50,cursor:cursor || undefined } }).then(response => { setRows(response.data); setNextCursor(response.headers['x-next-cursor'] || null); }).catch(failure => { if (!axios.isCancel(failure)) setError(failure.response?.data?.message || 'Không thể tải giao dịch trong ngày.'); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  },[businessId,selected,cursor,revision]);
  useEffect(() => { const timer=setInterval(() => { if (!document.hidden) setRevision(value => value+1); },30000); return () => clearInterval(timer); },[]);
  const daily=new Map(days.map(day => [day.date.slice(0,10),day]));
  const cells=[];
  const firstDay=(new Date(year,month,1).getDay()+6)%7;
  const previousDays=new Date(year,month,0).getDate();
  for(let i=0;i<firstDay;i++) cells.push({ number:previousDays-firstDay+i+1,muted:true });
  for(let number=1;number<=new Date(year,month+1,0).getDate();number++) cells.push({ number,key:dateKey(year,month,number) });
  for(let number=1;cells.length<35 || cells.length%7;number++) cells.push({ number,muted:true });
  return <section className="widget business-calendar">
    <div className="widget-header"><div><h3 className="widget-title">Lịch giao dịch</h3><p>Tháng {month+1}, {year} · Thu/chi đã duyệt</p></div>
      <div className="business-calendar-nav"><button aria-label="Tháng trước" disabled={loading || year===1900 && month===0} onClick={() => onDateChange(new Date(year,month-1,1))}>‹</button><button onClick={() => { const today=vietnamDate().split('-').map(Number); onDateChange(new Date(today[0],today[1]-1,today[2])); }}>Hôm nay</button><button aria-label="Tháng sau" disabled={loading || year===9998 && month===11} onClick={() => onDateChange(new Date(year,month+1,1))}>›</button><button disabled={loading} onClick={() => setRevision(value => value+1)}>Tải lại</button></div>
    </div>
    {error && <p role="alert">{error}</p>}
    <p>Mỗi ngày hiển thị tổng thu và tổng chi. Chọn ngày để xem giao dịch của quán.</p>
    <div className="cal-header-row">{['T2','T3','T4','T5','T6','T7','CN'].map(label => <div key={label}>{label}</div>)}</div>
    {loading ? <p role="status">Đang tải lịch…</p> : <div className="cal-grid">{cells.map((cell,index) => {
      const totals=daily.get(cell.key);
      return <button key={index} className={`cal-cell ${cell.muted ? 'muted' : ''} ${cell.key===vietnamDate() ? 'today' : ''} ${cell.key===selected ? 'business-calendar-selected' : ''}`} disabled={cell.muted} aria-pressed={!cell.muted && cell.key===selected} aria-label={cell.muted ? undefined : `${cell.number}/${month+1}/${year}: thu ${currency(totals?.income || 0)}, chi ${currency(totals?.expense || 0)}`} onClick={() => { if (cell.key===selected) return; setSelected(cell.key); setCursors(['']); setRows([]); setNextCursor(null); }}>
        <span className="cal-date">{cell.number}</span>
        {Number(totals?.income)>0 && <span className="tx-badge income">+{compact(totals.income)}</span>}
        {Number(totals?.expense)>0 && <span className="tx-badge expense">−{compact(totals.expense)}</span>}
      </button>;
    })}</div>}
    {selected && <div className="inventory business-calendar-details"><h3>Thu chi ngày {selected.split('-').reverse().join('/')}</h3><p>Thu: {currency(daily.get(selected)?.income || 0)} · Chi: {currency(daily.get(selected)?.expense || 0)}</p>
      {detailLoading ? <p role="status">Đang tải giao dịch…</p> : !rows.length ? <p>Chưa có giao dịch đã duyệt trong ngày này.</p> : <div className="inventory-table"><table><thead><tr><th>Danh mục</th><th>Nội dung</th><th>Hình thức</th><th>Số tiền</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.category}</td><td>{row.description}</td><td>{row.payment_method==='CASH' ? 'Tiền mặt' : row.payment_method==='TRANSFER' ? 'Chuyển khoản' : 'Chưa ghi nhận'}</td><td>{row.type==='INCOME' ? '+' : '−'}{currency(row.amount)}</td></tr>)}</tbody></table></div>}
      <div className="inventory-actions"><button disabled={detailLoading || cursors.length===1} onClick={() => setCursors(cursors.slice(0,-1))}>Trước</button><span>Trang {cursors.length}</span><button disabled={detailLoading || !nextCursor} onClick={() => setCursors([...cursors,nextCursor])}>Sau</button><button onClick={() => setSelected(null)}>Đóng chi tiết</button></div>
    </div>}
  </section>;
}
