import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { newRequestId } from '../../utils/requestId';
import { vietnamDate } from '../../utils/businessDate';
import '../inventory/inventory.css';

const statuses = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const blank = { type: 'EXPENSE', amount: '', category: '', description: '', paymentMethod: '' };
export default function TransactionApprovals({ user, businessId }) {
  const owner = user?.role === 'owner';
  const [rows,setRows] = useState([]);
  const [status,setStatus] = useState('PENDING');
  const [cursors,setCursors] = useState(['']);
  const [nextCursor,setNextCursor] = useState(null);
  const [autoApprove,setAutoApprove] = useState(false);
  const [form,setForm] = useState(blank);
  const [file,setFile] = useState(null);
  const fileInput = useRef(null);
  const attempt = useRef(null);
  const [loading,setLoading] = useState(true);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [image,setImage] = useState(null);
  const [revision,setRevision] = useState(0);
  const cursor = cursors.at(-1);
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },params: businessId ? { businessId } : {},timeout: 15000 });
  useEffect(() => {
    let active = true;
    axios.get('/api/business/approval-settings',config()).then(response => { if (active) setAutoApprove(response.data.auto_approve_transactions); }).catch(failure => { if (active) setError(failure.response?.data?.message || 'Không thể tải tuỳ chọn duyệt.'); });
    return () => { active = false; };
  },[businessId]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    const options = { ...config(),signal: controller.signal,params: { ...config().params,...(owner ? { status,cursor: cursor || undefined } : { scope: 'business',approvalStatus: 'ALL',limit: 50,cursor: cursor || undefined }) } };
    axios.get(owner ? '/api/business/approvals' : '/api/transactions',options).then(response => {
      setRows(owner ? response.data.transactions : response.data);
      setNextCursor(owner ? response.data.nextCursor : response.headers['x-next-cursor'] || null);
    }).catch(failure => { if (!axios.isCancel(failure)) setError(failure.response?.data?.message || 'Không thể tải thu chi.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[businessId,owner,status,cursor,revision]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !pending && cursors.length === 1) setRevision(value => value+1); },30000);
    return () => clearInterval(timer);
  },[pending,cursors.length]);
  useEffect(() => {
    if (!image) return;
    const onKey = event => { if (event.key === 'Escape') setImage(null); };
    document.addEventListener('keydown',onKey);
    return () => { URL.revokeObjectURL(image); document.removeEventListener('keydown',onKey); };
  },[image]);
  const perform = async action => {
    if (pending) return;
    setPending(true); setError(''); setSuccess('');
    try { await action(); setRevision(value => value+1); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.'); if (failure.response?.status === 409) setRevision(value => value+1); }
    finally { setPending(false); }
  };
  const submit = event => {
    event.preventDefault();
    perform(async () => {
      const signature = JSON.stringify({ ...form,file: file ? [file.name,file.size,file.lastModified] : null });
      if (attempt.current?.signature !== signature) attempt.current = { signature,requestId: newRequestId(),date: vietnamDate() };
      const payload = new FormData();
      Object.entries({ ...form,date: attempt.current.date,scope: 'business',requestId: attempt.current.requestId,...(businessId ? { businessId } : {}) }).forEach(([key,value]) => payload.append(key,value));
      if (file) payload.append('evidence',file);
      const { data } = await axios.post('/api/transactions',payload,config());
      setSuccess(data.approval_status === 'APPROVED' ? 'Khoản thu chi đã được tự động duyệt.' : 'Đã gửi khoản thu chi, đang chờ chủ quán duyệt.');
      setForm(blank); setFile(null); if (fileInput.current) fileInput.current.value=''; attempt.current=null;
      setCursors(['']);
    });
  };
  const showEvidence = id => perform(async () => {
    const response = await axios.get(`/api/business/evidence/${id}`,{ ...config(),responseType: 'blob' });
    setImage(URL.createObjectURL(response.data));
  });
  return <section className="inventory inventory-card">
    <div className="inventory-heading"><h2>{owner ? 'Duyệt thu chi' : 'Gửi khoản thu / chi'}</h2><button disabled={loading || pending} onClick={() => setRevision(value => value+1)}>Làm mới</button></div>
    <p className="inventory-error"><strong>Ảnh bằng chứng chỉ được lưu 1 tháng kể từ lúc tải lên.</strong> Sau thời hạn này ảnh sẽ bị xoá khỏi server, giao dịch vẫn được giữ lại. Khoản chờ duyệt hoặc bị từ chối chưa tính vào doanh thu/chi phí.</p>
    {error && <p role="alert" className="inventory-error">{error}</p>}{success && <p role="status" className="inventory-success">{success}</p>}
    {owner ? <>
      <label style={{ flexDirection: 'row',alignItems: 'center' }}><input style={{ width: 20,minHeight: 20 }} type="checkbox" checked={autoApprove} disabled={pending} onChange={event => { const value=event.target.checked; perform(async () => { const response=await axios.put('/api/business/approval-settings',{ autoApprove: value },config()); setAutoApprove(response.data.auto_approve_transactions); }); }} />Tự động duyệt khoản thu chi mới của nhân viên</label>
      <p className="inventory-muted">Áp dụng cả thu bán hàng và phụ thu bàn do nhân viên ghi nhận. Khoản đang chờ duyệt vẫn cần xử lý thủ công.</p>
      <label>Trạng thái<select value={status} disabled={pending} onChange={event => { setStatus(event.target.value); setCursors(['']); }}>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </> : <form onSubmit={submit}><fieldset disabled={pending} style={{ border: 0,padding: 0,margin: 0 }} className="inventory-form">
      <label>Loại<select value={form.type} onChange={event => setForm({ ...form,type: event.target.value })}><option value="EXPENSE">Khoản chi</option><option value="INCOME">Khoản thu</option></select></label>
      <label>Số tiền (đ)<input type="number" min="1" step="1" max="9007199254740991" required value={form.amount} onChange={event => setForm({ ...form,amount: event.target.value })} /></label>
      <label>Danh mục<input required maxLength={100} value={form.category} onChange={event => setForm({ ...form,category: event.target.value })} placeholder="Ví dụ: Mua nguyên liệu" /></label>
      <label className="inventory-wide">Nội dung<input maxLength={2000} value={form.description} onChange={event => setForm({ ...form,description: event.target.value })} /></label>
      <label>Hình thức<select required value={form.paymentMethod} onChange={event => setForm({ ...form,paymentMethod: event.target.value })}><option value="">Chọn hình thức</option><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option></select></label>
      <label>Ảnh bằng chứng (tuỳ chọn)<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { const selected=event.target.files[0]; if (selected && selected.size>5*1024*1024) { setError('Ảnh tối đa 5 MB.'); event.target.value=''; setFile(null); } else { setFile(selected || null); setError(''); } }} /><small>Một ảnh JPG, PNG, WebP hoặc GIF, tối đa 5 MB. Chỉ lưu 1 tháng.</small></label>
      <button className="inventory-primary">{pending ? 'Đang gửi…' : 'Gửi khoản thu chi'}</button>
    </fieldset></form>}
    <h3 style={{ marginTop: 24 }}>{owner ? 'Danh sách thu chi' : 'Các khoản bạn đã ghi nhận'}</h3>
    {loading ? <p role="status">Đang tải…</p> : !rows.length ? <p>Chưa có khoản thu chi.</p> : <div className="inventory-table"><table><thead><tr><th>Ngày / Người tạo</th><th>Nội dung</th><th>Số tiền / Hình thức</th><th>Trạng thái</th><th>Bằng chứng</th>{owner && <th>Duyệt</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td>{new Date(row.date).toLocaleDateString('vi-VN')}{owner && <small>{row.submitter_name}</small>}</td><td>{row.category}<small>{row.description}</small></td>
      <td>{row.type === 'INCOME' ? '+' : '-'}{Number(row.amount).toLocaleString('vi-VN')}đ<small>{row.payment_method === 'CASH' ? 'Tiền mặt' : row.payment_method === 'TRANSFER' ? 'Chuyển khoản' : 'Chưa ghi nhận'}</small></td><td>{statuses[row.approval_status]}</td>
      <td>{row.has_evidence ? <><button disabled={pending} onClick={() => showEvidence(row.id)}>Xem ảnh</button><small>Hết hạn: {new Date(row.evidence_expires_at).toLocaleString('vi-VN')}</small></> : row.evidence_expires_at ? 'Ảnh đã hết hạn' : 'Không có ảnh'}</td>
      {owner && <td>{row.approval_status === 'PENDING' && <div className="inventory-actions"><button className="inventory-primary" disabled={pending} onClick={() => perform(() => axios.post(`/api/business/approvals/${row.id}`,{ decision: 'APPROVED' },config()))}>Duyệt</button><button disabled={pending} onClick={() => perform(() => axios.post(`/api/business/approvals/${row.id}`,{ decision: 'REJECTED' },config()))}>Từ chối</button></div>}</td>}
    </tr>)}</tbody></table></div>}
    <div className="inventory-actions"><button disabled={loading || pending || cursors.length===1} onClick={() => setCursors(cursors.slice(0,-1))}>Trước</button><span>Trang {cursors.length}</span><button disabled={loading || pending || !nextCursor} onClick={() => setCursors([...cursors,nextCursor])}>Sau</button></div>
    {image && <div className="inventory-dialog-backdrop"><div role="dialog" aria-modal="true" aria-label="Ảnh bằng chứng" className="inventory-dialog"><button autoFocus onClick={() => setImage(null)}>Đóng ảnh</button><img src={image} alt="Bằng chứng của khoản thu chi" style={{ display: 'block',maxWidth: '100%',maxHeight: '70vh',objectFit: 'contain',marginTop: 12 }} /></div></div>}
  </section>;
}
