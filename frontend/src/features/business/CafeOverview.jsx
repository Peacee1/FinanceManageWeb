import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './CafeOverview.css';

export const isCafeModel = model => typeof model === 'string' && model.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === 'quan cafe';

export default function CafeOverview({ user, businessId }) {
  const [tables, setTables] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const requestSequence = useRef(0);
  const busy = useRef(false);
  const owner = user?.role === 'owner';
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, params: businessId ? { businessId } : {}, timeout: 10000 });

  const refresh = async () => {
    const sequence = ++requestSequence.current;
    try {
      const { data } = await axios.get('/api/business/tables', config());
      if (sequence === requestSequence.current) { setTables(data.tables); setMessage(''); }
    } catch (error) {
      if (sequence === requestSequence.current) setMessage(error.response?.data?.message || 'Không thể tải trạng thái bàn. Vui lòng thử lại.');
    } finally { if (sequence === requestSequence.current) setLoading(false); }
  };
  useEffect(() => {
    refresh();
    const onVisible = () => { if (!document.hidden && !busy.current) refresh(); };
    // Poll only while this tab is mounted and visible; no requests while editing.
    const timer = setInterval(onVisible, 15000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); requestSequence.current++; };
  }, [businessId]);

  const mutate = async (key, action) => {
    if (busy.current) return;
    busy.current = true;
    requestSequence.current++;
    setPending(key); setMessage('');
    try {
      const { data } = await action();
      setTables(current => key === 'create' ? [...current.filter(table => table.id !== data.table.id), data.table] : current.map(table => table.id === data.table.id ? data.table : table));
      if (key === 'create') setName('');
    } catch (error) {
      const detail = error.response?.data?.message || 'Không thể lưu trạng thái. Vui lòng tải lại để kiểm tra trước khi thử lại.';
      if (error.response?.status === 409) await refresh();
      setMessage(detail);
    } finally { busy.current = false; setPending(null); setLoading(false); }
  };
  const occupied = tables.filter(table => table.is_occupied).length;
  return <section className="cafe-overview">
    <div className="cafe-heading"><div><h2>Tổng quan quán</h2><p>{tables.length} bàn · {occupied} có khách · {tables.length - occupied} còn trống</p></div><button className="btn-primary" disabled={pending !== null} onClick={refresh}>Tải lại</button></div>
    {owner && <form className="cafe-create" onSubmit={event => { event.preventDefault(); mutate('create', () => axios.post('/api/business/tables', { name }, config())); }}>
      <label htmlFor="cafe-table-name">Tên bàn<input id="cafe-table-name" value={name} maxLength={50} placeholder="Ví dụ: Bàn 1" required disabled={pending !== null} onChange={event => setName(event.target.value)} /></label>
      <button className="btn-primary" disabled={pending !== null || !name.trim()}>{pending === 'create' ? 'Đang tạo…' : 'Thêm bàn'}</button>
    </form>}
    {message && <p role="alert" className="cafe-message">{message}</p>}
    <p className="cafe-hint">Trạng thái được dùng chung cho chủ quán và nhân viên. Tự cập nhật mỗi 15 giây khi mở tab này.</p>
    {loading ? <p role="status">Đang tải bàn…</p> : tables.length === 0 ? <p>{owner ? 'Chưa có bàn. Nhập tên bàn để bắt đầu.' : 'Chủ quán chưa tạo bàn.'}</p> : <div className="cafe-grid">
      {tables.map(table => <article key={table.id} className={`cafe-table ${table.is_occupied ? 'occupied' : ''}`}>
        <h3>{table.name}</h3><p className="cafe-status">{table.is_occupied ? '● Có khách' : '○ Còn trống'}</p>
        <button className="btn-primary" disabled={pending !== null} aria-label={`${table.name}: đánh dấu ${table.is_occupied ? 'còn trống' : 'có khách'}`} onClick={() => mutate(table.id, () => axios.patch(`/api/business/tables/${table.id}/occupancy`, { isOccupied: !table.is_occupied, version: table.version }, config()))}>{pending === table.id ? 'Đang lưu…' : table.is_occupied ? 'Đánh dấu còn trống' : 'Đánh dấu có khách'}</button>
      </article>)}
    </div>}
  </section>;
}
