import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './BankPayments.css';

export const paymentConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, timeout: 10000 });
export const bankStatus = { WAITING: 'Chờ tiền vào', EXPIRED: 'Hết thời hạn · cần đối soát', PAID: 'Ngân hàng đã xác nhận', CANCELLED: 'Đã huỷ' };
export const bankMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function BankPaymentDialog({ payment: initial, onClose, onChanged }) {
  const [payment, setPayment] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  useEffect(() => {
    dialog.current.showModal();
    let active = true, loading = false, previous = initial.status;
    const refresh = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const { data } = await axios.get(`/api/payments/intents/${initial.id}`, paymentConfig());
        if (active) {
          setPayment(data.payment); setError('');
          if (data.payment.status !== previous) { previous = data.payment.status; changed.current?.(); }
        }
      } catch (failure) { if (active) setError(failure.response?.data?.message || 'Không thể kiểm tra tiền vào. Vui lòng thử lại.'); }
      finally { loading = false; }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [initial.id]);
  const cancel = async () => {
    if (!window.confirm('Huỷ yêu cầu chuyển khoản? Thao tác này không hoàn tiền ngân hàng và không hoàn kho hàng đã bán.')) return;
    setBusy(true);
    try {
      await axios.post(`/api/payments/intents/${payment.id}/cancel`, {}, paymentConfig());
      setPayment(current => ({ ...current, status: 'CANCELLED' })); changed.current?.();
    } catch (failure) { setError(failure.response?.data?.message || 'Không thể huỷ yêu cầu.'); }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="bank-dialog" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>Chuyển khoản {bankMoney(payment.amount)}</h2>
    <p role="status"><strong>{bankStatus[payment.status]}</strong></p>
    {payment.status === 'WAITING' && <img className="bank-qr" src={payment.qrUrl} referrerPolicy="no-referrer" alt="QR chuyển khoản đúng số tiền và mã thanh toán" />}
    <p>{payment.bank} · {payment.accountNumber}<br />{payment.accountName}</p>
    <p>Nội dung chuyển khoản: <strong className="bank-code">{payment.code}</strong></p>
    <p>Thời hạn: {new Date(payment.expiresAt).toLocaleString('vi-VN')}</p>
    <p>Chỉ xác nhận khi server nhận được thông báo tiền vào hợp lệ. Doanh thu còn cần được chủ quán duyệt.</p>
    {payment.status === 'EXPIRED' && <p>Không chuyển khoản thêm bằng mã này. Nếu đã chuyển tiền, liên hệ chủ quán để đối soát.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="bank-actions">
      {['WAITING', 'EXPIRED'].includes(payment.status) && <button disabled={busy} onClick={cancel}>Huỷ yêu cầu</button>}
      <button autoFocus onClick={onClose}>Đóng</button>
    </div>
  </dialog>;
}
