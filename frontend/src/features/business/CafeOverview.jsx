import BankPaymentDialog from './BankPaymentDialog';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './CafeOverview.css';
import TableHistory from './TableHistory';

export const isCafeModel = model => typeof model === 'string' && model.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === 'quan cafe';
const money = amount => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const elapsedTime = (startedAt,now) => {
  const seconds=Math.max(0,Math.floor((now-new Date(startedAt).getTime())/1000));
  return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
};
function BillingFields({ value, onChange, disabled, prefix }) {
  return <div className="cafe-billing-fields">
    <label><input type="checkbox" checked={value.surchargeEnabled} disabled={disabled} onChange={event => onChange({ ...value, surchargeEnabled: event.target.checked })} /> Phụ thu theo giờ</label>
    {value.surchargeEnabled && <>
      <label htmlFor={`${prefix}-rate`}>Giá mỗi giờ (đ)<input id={`${prefix}-rate`} type="number" min="1" max="1000000000" step="1" required value={value.hourlyRate} disabled={disabled} onChange={event => onChange({ ...value, hourlyRate: event.target.value })} /></label>
      <label htmlFor={`${prefix}-unit`}>Cách tính thời gian<select id={`${prefix}-unit`} value={value.billingUnit} disabled={disabled} onChange={event => onChange({ ...value, billingUnit: event.target.value })}><option value="HOUR">Làm tròn lên mỗi giờ</option><option value="MINUTE">Theo phút (làm tròn lên một phút)</option></select></label>
      <small>Giá luôn tính theo giờ. Theo phút: 30 phút × 15.000đ/giờ = 7.500đ. Số tiền lẻ làm tròn lên 1đ.</small>
    </>}
  </div>;
}

export default function CafeOverview({ user, businessId }) {
  const [bankPayment, setBankPayment] = useState(null);
  const [tables, setTables] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const [editing, setEditing] = useState(null);
  const [billing, setBilling] = useState({ surchargeEnabled: false, hourlyRate: 5000, billingUnit: 'HOUR' });
  const [quote, setQuote] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedTable,setSelectedTable] = useState(null);
  const [now,setNow] = useState(Date.now());
  useEffect(() => { const timer=setInterval(() => { if (!document.hidden) setNow(Date.now()); },1000); return () => clearInterval(timer); },[]);
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
      setTables(current => data.deletedId ? current.filter(table => table.id !== data.deletedId) : key === 'create' ? [...current.filter(table => table.id !== data.table.id), data.table] : current.map(table => table.id === data.table.id ? data.table : table));
      if (data.bankPayment) setBankPayment(data.bankPayment);
      setEditing(null);
      setQuote(null); setPaymentMethod('');
      if (key === 'create') setName('');
    } catch (error) {
      const detail = error.response?.data?.message || 'Không thể lưu trạng thái. Vui lòng tải lại để kiểm tra trước khi thử lại.';
      if ([404, 409].includes(error.response?.status)) { await refresh(); setEditing(null); setQuote(null); }
      setMessage(detail);
    } finally { busy.current = false; setPending(null); setLoading(false); }
  };
  const fetchQuote = async table => {
    if (busy.current) return;
    busy.current = true; requestSequence.current++; setPending(table.id); setMessage('');
    try {
      const { data } = await axios.post(`/api/business/tables/${table.id}/quote`, { version: table.version }, config());
      if (data.quote.bankPayment) { setBankPayment(data.quote.bankPayment); setQuote(null); } else setQuote(data.quote); setPaymentMethod('');
    } catch (error) {
      if ([404, 409].includes(error.response?.status)) await refresh();
      setMessage(error.response?.data?.message || 'Không thể lấy bảng phí. Vui lòng thử lại.');
    } finally { busy.current = false; setPending(null); }
  };
  const occupied = tables.filter(table => table.is_occupied).length;
  return <section className="cafe-overview">
    {bankPayment && <BankPaymentDialog payment={bankPayment} onClose={() => setBankPayment(null)} onChanged={refresh} />}
    <div className="cafe-heading"><div><h2>Tổng quan quán</h2><p>{tables.length} bàn · {occupied} có khách · {tables.length - occupied} còn trống</p></div><button className="btn-primary" disabled={pending !== null} onClick={refresh}>Tải lại</button></div>
    {owner && <form className="cafe-create" onSubmit={event => { event.preventDefault(); mutate('create', () => axios.post('/api/business/tables', { name, ...billing }, config())); }}>
      <label htmlFor="cafe-table-name">Tên bàn<input id="cafe-table-name" value={name} maxLength={50} placeholder="Ví dụ: Bàn 1" required disabled={pending !== null} onChange={event => setName(event.target.value)} /></label>
      <button className="btn-primary" disabled={pending !== null || !name.trim()}>{pending === 'create' ? 'Đang tạo…' : 'Thêm bàn'}</button>
      <BillingFields value={billing} onChange={setBilling} disabled={pending !== null} prefix="create-table" />
    </form>}
    {message && <p role="alert" className="cafe-message">{message}</p>}
    {quote && <form className="cafe-payment" onSubmit={event => { event.preventDefault(); mutate(quote.tableId, () => axios.post(`/api/business/tables/${quote.tableId}/pay`, { sessionId: quote.sessionId, quoteToken: quote.quoteToken, paymentMethod }, config())); }}>
      <h3>Thanh toán phụ thu · {quote.tableName}</h3>
      <p>Bắt đầu: {new Date(quote.startedAt).toLocaleString('vi-VN')} · Tính đến: {new Date(quote.endedAt).toLocaleString('vi-VN')}</p>
      <p>{quote.units} {quote.billingUnit === 'HOUR' ? 'giờ (làm tròn lên)' : 'phút (làm tròn lên)'} · {money(quote.hourlyRate)}/giờ</p>
      <p><strong>Phải thanh toán: {money(quote.amount)}</strong></p>
      <p>Bảng phí có hiệu lực 2 phút. Giá được giữ theo thời điểm mở bàn.</p>
      <label htmlFor="table-payment-method">Hình thức thanh toán<select id="table-payment-method" required value={paymentMethod} disabled={pending !== null} onChange={event => setPaymentMethod(event.target.value)}><option value="">Chọn hình thức</option><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option></select></label>
      <div className="cafe-table-actions"><button className="btn-primary" disabled={pending !== null || !paymentMethod}>Xác nhận đã thu tiền và đóng bàn</button><button className="btn-primary" type="button" disabled={pending !== null} onClick={() => setQuote(null)}>Huỷ</button></div>
    </form>}
    <p className="cafe-hint">Trạng thái được dùng chung cho chủ quán và nhân viên. Tự cập nhật mỗi 15 giây khi mở tab này.</p>
    {user?.role === 'employee' && <p className="cafe-hint">Khoản phụ thu đã thu tiền xuất hiện trong mục Gửi thu / chi. Doanh thu chỉ được tính sau khi khoản thu được duyệt.</p>}
    {loading ? <p role="status">Đang tải bàn…</p> : tables.length === 0 ? <p>{owner ? 'Chưa có bàn. Nhập tên bàn để bắt đầu.' : 'Chủ quán chưa tạo bàn.'}</p> : <div className="cafe-grid">
      {tables.map(table => <article key={table.id} className={`cafe-table ${table.is_occupied ? 'occupied' : ''}`} onClick={event => { if (!event.target.closest('button,input,select,form,label,a')) setSelectedTable(table.id); }}>
        <h3><button type="button" className="cafe-detail-button" onClick={() => setSelectedTable(table.id)} aria-label={`Xem trạng thái và lịch sử ${table.name}`}>{table.name}</button></h3><p className="cafe-status">{table.is_occupied ? '● Có khách' : '○ Còn trống'}</p>
        {table.current_session_id && table.occupied_since && <p className="cafe-elapsed">Đã mở: <strong>{elapsedTime(table.occupied_since,now)}</strong></p>}
        <p>{table.surcharge_enabled ? `${money(table.hourly_rate)}/giờ · ${table.billing_unit === 'HOUR' ? 'Làm tròn theo giờ' : 'Theo phút'}` : 'Không phụ thu'}{table.current_session_id && <><br />Phiên hiện tại phải thanh toán trước khi đóng.</>}</p>
        {owner && (editing?.id === table.id ? <form className="cafe-create" onSubmit={event => { event.preventDefault(); mutate(table.id, () => axios.put(`/api/business/tables/${table.id}`, { ...editing }, config())); }}>
          <label htmlFor={`table-name-${table.id}`}>Tên bàn<input id={`table-name-${table.id}`} value={editing.name} required maxLength={50} disabled={pending !== null} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
          <BillingFields value={editing} onChange={setEditing} disabled={pending !== null} prefix={`edit-table-${table.id}`} />
          {table.is_occupied && <small>Đổi giá/cách tính chỉ áp dụng cho lượt mở bàn tiếp theo.</small>}
          <button className="btn-primary" disabled={pending !== null || !editing.name.trim()}>Lưu tên</button>
          <button type="button" className="btn-primary" disabled={pending !== null} onClick={() => setEditing(null)}>Huỷ</button>
        </form> : <div className="cafe-table-actions">
          <button className="btn-primary" disabled={pending !== null} onClick={() => setEditing({ id: table.id, name: table.name, version: table.version, surchargeEnabled: table.surcharge_enabled, hourlyRate: table.hourly_rate, billingUnit: table.billing_unit })} aria-label={`Sửa ${table.name}`}>Sửa bàn</button>
          <button className="btn-primary" disabled={pending !== null} onClick={() => { if (window.confirm(`Xoá ${table.name}${table.is_occupied ? ' (đang có khách)' : ''}? Bạn sẽ cần tạo lại nếu muốn sử dụng bàn này.`)) mutate(table.id, () => axios.delete(`/api/business/tables/${table.id}`, { ...config(), data: { version: table.version } })); }} aria-label={`Xoá ${table.name}`}>Xoá bàn</button>
        </div>)}
        <button className="btn-primary" disabled={pending !== null} aria-label={`${table.name}: ${table.current_session_id ? 'thanh toán và đóng bàn' : table.is_occupied ? 'đánh dấu còn trống' : 'đánh dấu có khách'}`} onClick={() => table.current_session_id ? fetchQuote(table) : mutate(table.id, () => axios.patch(`/api/business/tables/${table.id}/occupancy`, { isOccupied: !table.is_occupied, version: table.version }, config()))}>{pending === table.id ? 'Đang lưu…' : table.current_session_id ? 'Thanh toán và đóng bàn' : table.is_occupied ? 'Đánh dấu còn trống' : 'Đánh dấu có khách'}</button>
      </article>)}
    </div>}
    {selectedTable && <TableHistory tableId={selectedTable} businessId={businessId} onClose={() => setSelectedTable(null)} />}
  </section>;
}
