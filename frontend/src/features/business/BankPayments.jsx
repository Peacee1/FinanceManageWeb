import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BankPaymentDialog, { paymentConfig, bankStatus, bankMoney } from './BankPaymentDialog';

export default function BankPayments({ user }) {
  const owner = user?.role === 'owner';
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ bank: 'MBBank', accountNumber: '', accountName: '', enabled: false, confirmedLiveConnection: false });
  const [secret, setSecret] = useState('');
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState('');
  const [next, setNext] = useState(null);
  const [eventCursor, setEventCursor] = useState('');
  const [eventNext, setEventNext] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    axios.get('/api/payments/connection', paymentConfig()).then(({ data }) => {
      if (active) { setSettings(data); if (data.connection) setForm(current => ({ ...current, ...data.connection })); }
    }).catch(failure => { if (active) setError(failure.response?.data?.message || 'Không thể tải kết nối.'); });
    return () => { active = false; };
  }, [owner]);
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/api/payments/intents', { ...paymentConfig(), signal: controller.signal, params: { cursor: cursor || undefined } }).then(({ data }) => { setPayments(data.payments); setNext(data.nextCursor); }).catch(failure => { if (!axios.isCancel(failure)) setError('Không thể tải yêu cầu thanh toán.'); });
    if (owner) axios.get('/api/payments/events', { ...paymentConfig(), signal: controller.signal, params: { cursor: eventCursor || undefined } }).then(({ data }) => { setEvents(data.events); setEventNext(data.nextCursor); }).catch(failure => { if (!axios.isCancel(failure)) setError('Không thể tải giao dịch ngân hàng.'); });
    return () => controller.abort();
  }, [owner, cursor, eventCursor, revision]);
  const perform = async action => {
    setBusy(true); setError('');
    try { await action(); setRevision(value => value + 1); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể lưu thay đổi.'); }
    finally { setBusy(false); }
  };
  return <section className="bank-panel">
    <h2>Ngân hàng · SePay</h2>
    <p>Khoản thu chuyển khoản có QR riêng. Chỉ tính doanh thu sau khi ngân hàng xác nhận và chủ quán duyệt.</p>
    {error && <p role="alert">{error}</p>}
    {owner && settings && <>
      {!settings.ready && <p role="status">Chưa thể kích hoạt: đang chờ tên miền HTTPS và cấu hình server.</p>}
      <form onSubmit={event => { event.preventDefault(); perform(async () => {
        setSecret('');
        const { data } = await axios.put('/api/payments/connection', form, paymentConfig());
        setSettings(current => ({ ...current, connection: data.connection })); setSecret(data.webhookSecret || '');
      }); }}>
        <label>Ngân hàng<select value={form.bank} onChange={event => setForm({ ...form, bank: event.target.value })}>{settings.banks.map(bank => <option key={bank}>{bank}</option>)}</select></label>
        <label>Số tài khoản<input required inputMode="numeric" pattern="[0-9]{6,30}" value={form.accountNumber} onChange={event => setForm({ ...form, accountNumber: event.target.value })} /></label>
        <label>Tên chủ tài khoản<input required maxLength={100} value={form.accountName} onChange={event => setForm({ ...form, accountName: event.target.value })} /></label>
        <label className="bank-check"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} />Bật xác nhận tiền vào</label>
        <label className="bank-check"><input type="checkbox" checked={form.confirmedLiveConnection} onChange={event => setForm({ ...form, confirmedLiveConnection: event.target.checked })} />Đã liên kết đúng tài khoản ngân hàng và webhook SePay Live</label>
        <label className="bank-check"><input type="checkbox" checked={Boolean(form.rotateSecret)} onChange={event => setForm({ ...form, rotateSecret: event.target.checked })} />Tạo lại khoá webhook (cần cập nhật trên SePay)</label>
        <button disabled={busy || !settings.ready}>Lưu kết nối</button>
      </form>
      {settings.connection?.webhookUrl && <p className="bank-code">Webhook: {settings.connection.webhookUrl}</p>}
      {secret && <p className="bank-code">Khoá HMAC chỉ hiển thị lần này, sao chép vào cấu hình webhook SePay: <strong>{secret}</strong></p>}
      <p>Tạo kết nối ở trạng thái tắt trước, cấu hình webhook HMAC trên SePay rồi bật. Chế độ thử nghiệm không dùng để xác nhận tiền thật.</p>
    </>}
    <h3>Yêu cầu thanh toán</h3>
    <button disabled={busy} onClick={() => setRevision(value => value + 1)}>Làm mới</button>
    {!payments.length && <p>Chưa có yêu cầu chuyển khoản.</p>}
    {payments.map(item => <div className="bank-row" key={item.id}><strong>{bankMoney(item.amount)} · {bankStatus[item.status]}</strong><p>{item.code}<br />Mã đối soát: {item.id}</p><button onClick={() => setPayment(item)}>Xem thanh toán</button></div>)}
    <div className="bank-actions"><button disabled={!cursor} onClick={() => setCursor('')}>Trang đầu</button><button disabled={!next} onClick={() => setCursor(next)}>Trang tiếp</button></div>
    {owner && <><h3>Giao dịch ngân hàng</h3><p>Khoản thiếu mã, sai số tiền hoặc hết hạn cần kiểm tra. Đối soát thủ công vẫn yêu cầu đúng tài khoản và đúng số tiền.</p>
      {!events.length && <p>Chưa nhận thông báo ngân hàng.</p>}
      {events.map(item => <div className="bank-row" key={item.id}><strong>{bankMoney(item.amount)} · {item.status}</strong><p>{new Date(item.occurred_at).toLocaleString('vi-VN')} · {item.content}</p>
        {item.status !== 'MATCHED' && <form onSubmit={event => { event.preventDefault(); const intentId = new FormData(event.currentTarget).get('intentId'); if (window.confirm('Xác nhận đối soát tiền vào với yêu cầu đã chọn?')) perform(() => axios.post(`/api/payments/events/${item.id}/reconcile`, { intentId }, paymentConfig())); }}><label>Mã đối soát của yêu cầu thanh toán<input name="intentId" required defaultValue={item.intent_id || ''} /></label><button disabled={busy}>Đối soát</button></form>}
      </div>)}
      <div className="bank-actions"><button disabled={!eventCursor} onClick={() => setEventCursor('')}>Trang đầu</button><button disabled={!eventNext} onClick={() => setEventCursor(eventNext)}>Trang tiếp</button></div>
    </>}
    {payment && <BankPaymentDialog key={payment.id} payment={payment} onClose={() => setPayment(null)} onChanged={() => setRevision(value => value + 1)} />}
  </section>;
}
