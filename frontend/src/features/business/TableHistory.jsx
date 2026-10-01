import React, { useEffect,useRef,useState } from 'react';
import axios from 'axios';
import { vietnamDate } from '../../utils/businessDate';
const localTime = value => new Date(value).toLocaleString('vi-VN',{ timeZone:'Asia/Ho_Chi_Minh' });
export default function TableHistory({ tableId,businessId,onClose }) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [cursors,setCursors]=useState(['']),[revision,setRevision]=useState(0);
  const cursor=cursors.at(-1);
  const dialog=useRef(null);
  useEffect(() => {
    const previous=document.activeElement;
    dialog.current?.focus();
    const key = event => {
      if (event.key==='Escape') onClose();
      if (event.key==='Tab') {
        const buttons=[...dialog.current.querySelectorAll('button:not(:disabled)')];
        const first=buttons[0],last=buttons.at(-1);
        if (event.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown',key);
    return () => { document.removeEventListener('keydown',key); previous?.focus(); };
  },[]);
  useEffect(() => {
    const controller=new AbortController(); setLoading(true); setError('');
    axios.get(`/api/business/tables/${tableId}/history`,{ signal:controller.signal,timeout:10000,headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },params:{ businessId,date:vietnamDate(),cursor:cursor || undefined } }).then(response => setData(response.data)).catch(failure => { if (!axios.isCancel(failure)) setError(failure.response?.data?.message || 'Không thể tải lịch sử bàn.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[tableId,businessId,cursor,revision]);
  useEffect(() => { const timer=setInterval(() => { if (!document.hidden) setRevision(value => value+1); },15000); return () => clearInterval(timer); },[]);
  return <div className="cafe-history-backdrop" onClick={event => { if (event.target===event.currentTarget) onClose(); }}><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="table-history-title" className="cafe-history-dialog">
    <div className="cafe-heading"><h2 id="table-history-title">{data?.table.name || 'Chi tiết bàn'}</h2><button className="btn-primary" onClick={onClose}>Đóng</button></div>
    {data && <><p>Trạng thái: <strong>{data.table.is_occupied ? 'Có khách' : 'Còn trống'}</strong></p>{data.table.occupied_since && <p>Có khách từ: {localTime(data.table.occupied_since)}</p>}<h3>Lịch sử hôm nay · {data.date.split('-').reverse().join('/')}</h3></>}
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải lịch sử…</p> : !data?.history.length ? <p>Chưa có lần đánh dấu có khách trong ngày.</p> : <ol className="cafe-history-list">{data.history.map(entry => <li key={entry.id}><p><strong>Có khách từ:</strong> {localTime(entry.started_at)}</p><p><strong>{entry.closed_at ? 'Đóng bàn lúc:' : 'Trạng thái:'}</strong> {entry.closed_at ? localTime(entry.closed_at) : 'Đang có khách, chưa đóng bàn'}</p>{entry.start_estimated && <small>Phiên cũ: thời gian bắt đầu theo dõi từ lúc cập nhật tính năng.</small>}</li>)}</ol>}
    <div className="cafe-table-actions"><button className="btn-primary" disabled={loading || cursors.length===1} onClick={() => setCursors(cursors.slice(0,-1))}>Trước</button><button className="btn-primary" disabled={loading || !data?.nextCursor} onClick={() => setCursors([...cursors,data.nextCursor])}>Sau</button><button className="btn-primary" disabled={loading} onClick={() => setRevision(value => value+1)}>Tải lại</button></div>
  </div></div>;
}
