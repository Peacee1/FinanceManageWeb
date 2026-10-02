import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bell, X, CheckCheck, CircleDollarSign, Gift, Users, Building2 } from 'lucide-react';
import './notifications.css';
const icons = { income_added: CircleDollarSign, expense_added: CircleDollarSign, checkin_reminder: Gift, family_joined: Users, family_dissolved: Users, family_promo: Users, business_promo: Building2 };
const time = date => new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export default function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false), [items, setItems] = useState([]), [unread, setUnread] = useState(0), [cursor, setCursor] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const root = useRef(null), mounted = useRef(false), fetching = useRef(false);
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const refresh = async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const response = await axios.get('/api/users/notifications', config());
      if (mounted.current) { setItems(response.data.items); setUnread(response.data.unread); setCursor(response.data.nextCursor); setError(''); }
    } catch { if (mounted.current) setError('Không thể tải thông báo. Hãy thử lại.'); }
    finally { fetching.current = false; }
  };
  useEffect(() => {
    mounted.current = true; refresh();
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, 20000); window.addEventListener('focus', tick);
    const interceptor = axios.interceptors.response.use(response => {
      if (response.config.method === 'post' && /\/api\/(transactions|users\/(checkin|family)|ai\/chat)/.test(response.config.url || '')) refresh();
      return response;
    });
    const close = event => { if (root.current && !root.current.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('focus', tick); axios.interceptors.response.eject(interceptor); document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  const read = async item => {
    try {
      await axios.post('/api/users/notifications/read', { id: item.id }, config());
      setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: row.read_at || new Date().toISOString() } : row));
      setOpen(false); onNavigate?.(item.target); refresh();
    } catch { setError('Không thể đánh dấu đã đọc. Hãy thử lại.'); }
  };
  const readAll = async () => {
    setBusy(true);
    try { await axios.post('/api/users/notifications/read', { all: true }, config()); await refresh(); }
    catch { setError('Không thể đánh dấu đã đọc. Hãy thử lại.'); }
    finally { setBusy(false); }
  };
  const more = async () => {
    setBusy(true);
    try { const result = await axios.get(`/api/users/notifications?before=${cursor}`, config()); setItems(current => [...current,...result.data.items.filter(item => !current.some(row => row.id === item.id))]); setCursor(result.data.nextCursor); setUnread(result.data.unread); }
    catch { setError('Không thể tải thêm thông báo.'); }
    finally { setBusy(false); }
  };
  return <div className="notification-center" ref={root}>
    <button type="button" className="notification-bell" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) refresh(); }}><Bell size={20} />{unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <section className="notification-panel" aria-label="Trung tâm thông báo">
      <div className="notification-panel-heading"><div><h3>Thông báo</h3><p>{unread ? `${unread} thông báo chưa đọc` : 'Bạn đã đọc tất cả thông báo'}</p></div><button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <button type="button" className="notification-read-all" disabled={!unread || busy} onClick={readAll}><CheckCheck size={16} />Đánh dấu tất cả đã đọc</button>
      {error && <div className="notification-error" role="alert">{error}<button type="button" onClick={refresh}>Thử lại</button></div>}
      <div className="notification-list">
        {!items.length && !error && <div className="notification-empty"><Bell size={28} /><strong>Chưa có thông báo</strong><p>Các khoản thu chi và cập nhật Gia đình sẽ xuất hiện tại đây.</p></div>}
        {items.map(item => { const Icon = icons[item.kind] || Bell; return <button type="button" key={item.id} className={`notification-item ${item.read_at ? '' : 'unread'}`} onClick={() => read(item)}><span className={`notification-item-icon ${item.kind}`}><Icon size={19} /></span><span className="notification-item-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{time(item.created_at)}</small></span>{!item.read_at && <i className="notification-unread-dot" />}</button>; })}
        {cursor && <button type="button" className="notification-more" disabled={busy} onClick={more}>Xem thêm</button>}
      </div>
    </section>}
  </div>;
}
