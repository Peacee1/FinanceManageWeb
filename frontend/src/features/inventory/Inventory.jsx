import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { vietnamDate } from '../../utils/businessDate';
import './inventory.css';
import { newRequestId } from '../../utils/requestId';

const labels = { IN: 'Nhập kho', OUT: 'Xuất kho' };
const reasons = { RECEIPT: 'Nhập hàng', MANUAL: 'Xuất thủ công', SALE: 'Bán hàng' };
const initialForm = { productId: '', type: 'IN', quantity: '', note: '' };

export default function Inventory({ user, businessId }) {
  const movementAttempt = useRef(null);
  const isOwner = user.role === 'owner';
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [newProduct, setNewProduct] = useState({ name: '', price: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [cursors, setCursors] = useState(['']);
  const [nextCursor, setNextCursor] = useState(null);
  const cursor = cursors.at(-1);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const api = (method, url, data) => axios({ method, url, data, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, params: businessId ? { businessId } : {} });
  const load = async () => {
    const result = await api('get', '/api/business/inventory');
    setProducts(result.data.products);
    if (isOwner) {
      const history = await api('get', `/api/business/inventory/movements?cursor=${encodeURIComponent(cursor)}&type=${filter}`);
      setMovements(history.data.movements);
      setHasMore(history.data.hasMore);
      setNextCursor(history.data.nextCursor);
    }
  };
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try { await load(); if (active) setFailure(''); }
      catch (error) { if (active) setFailure(error.response?.data?.message || 'Không thể tải kho hàng. Vui lòng thử lại.'); }
      finally { if (active) setLoading(false); }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [businessId, isOwner, cursor, filter]);

  const save = async (action) => {
    if (saving) return;
    setSaving(true); setFailure(''); setMessage('');
    try { const result = await action(); setMessage(result.data.message || 'Đã lưu.'); await load(); }
    catch (error) { setFailure(error.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const visible = products.filter(product => product.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const tracked = products.filter(product => product.track_stock);

  return <section className="inventory" aria-label="Kho hàng doanh nghiệp">
    <div className="inventory-heading"><div><h2>Kho hàng</h2><p>Quản lý tồn kho và ghi nhận từng lần nhập, xuất.</p></div><button disabled={saving} onClick={() => save(() => api('get', '/api/business/inventory'))}>Làm mới</button></div>
    {failure && <div className="inventory-error" role="alert">{failure}</div>}
    {message && <div className="inventory-success" role="status">{message}</div>}
    <div className="inventory-stats">
      <div><span>Mặt hàng</span><strong>{products.length}</strong></div>
      <div><span>Tổng tồn đang quản lý</span><strong>{tracked.reduce((sum, product) => sum + product.stock_quantity, 0)}</strong></div>
      <div><span>Sắp hết / hết hàng (≤ 5)</span><strong>{tracked.filter(product => product.stock_quantity <= 5).length}</strong></div>
    </div>
    <form className="inventory-card inventory-form" onSubmit={event => { event.preventDefault(); save(async () => { const signature = JSON.stringify(form); if (movementAttempt.current?.signature !== signature) movementAttempt.current = { signature, requestId: newRequestId() }; const result = await api('post', '/api/business/inventory/movements', { ...form, quantity: Number(form.quantity), productId: Number(form.productId), requestId: movementAttempt.current.requestId }); movementAttempt.current = null; setForm(initialForm); return result; }); }}>
      <h3>Lập phiếu nhập / xuất kho</h3>
      <label>Mặt hàng<select value={form.productId} onChange={event => setForm({ ...form, productId: event.target.value })} required disabled={saving}><option value="">Chọn mặt hàng</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} — {product.track_stock ? `tồn ${product.stock_quantity}` : 'chưa theo dõi tồn'}</option>)}</select></label>
      <label>Loại phiếu<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} disabled={saving}><option value="IN">Nhập kho</option><option value="OUT">Xuất kho</option></select></label>
      <label>Số lượng<input type="number" min="1" max="1000000" step="1" required value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} disabled={saving} /></label>
      <label className="inventory-wide">Ghi chú<input maxLength="500" placeholder="Ví dụ: nhập từ nhà cung cấp, hàng hỏng…" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} disabled={saving} /></label>
      <p className="inventory-wide inventory-muted">Ngày phiếu được ghi theo giờ Việt Nam. Phiếu nhập/xuất thủ công cập nhật số lượng tồn; thu chi được ghi riêng trong sổ quỹ.</p>
      <button className="inventory-primary" type="submit" disabled={saving || !products.length}>{saving ? 'Đang lưu...' : `Lưu phiếu ${form.type === 'IN' ? 'nhập' : 'xuất'}`}</button>
    </form>
    {isOwner && <details className="inventory-card"><summary>Thêm mặt hàng vào kho</summary><form className="inventory-form" onSubmit={event => { event.preventDefault(); save(async () => { const result = await api('post', '/api/business/products', newProduct); setNewProduct({ name: '', price: '' }); return result; }); }}>
      <label>Tên mặt hàng<input required maxLength="100" value={newProduct.name} onChange={event => setNewProduct({ ...newProduct, name: event.target.value })} /></label>
      <label>Giá bán (₫)<input type="number" min="1" step="1" required value={newProduct.price} onChange={event => setNewProduct({ ...newProduct, price: event.target.value })} /></label>
      <button className="inventory-primary" disabled={saving}>Thêm mặt hàng</button>
    </form></details>}
    <div className="inventory-card">
      <div className="inventory-heading"><h3>Tồn kho hiện tại</h3><label>Tìm mặt hàng<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên mặt hàng" /></label></div>
      {loading ? <p role="status">Đang tải...</p> : !visible.length ? <p>Chưa có mặt hàng phù hợp.{isOwner && ' Thêm sản phẩm để bắt đầu.'}</p> : <div className="inventory-table"><table><thead><tr><th>Mặt hàng</th><th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}>
        <td>{product.name}</td><td>{Number(product.price).toLocaleString('vi-VN')} ₫</td><td><strong>{product.track_stock ? product.stock_quantity : '—'}</strong></td><td>{!product.track_stock ? 'Chưa theo dõi' : product.stock_quantity === 0 ? 'Hết hàng' : product.stock_quantity <= 5 ? 'Sắp hết' : 'Còn hàng'}</td>
      </tr>)}</tbody></table></div>}
      <p className="inventory-muted">Sản phẩm cũ chưa theo dõi tồn: nhập số lượng thực tế để bắt đầu quản lý. Bán hàng sẽ tự xuất kho với các mặt hàng đang theo dõi.</p>
    </div>
    {isOwner && <div className="inventory-card">
      <div className="inventory-heading"><h3>Lịch sử nhập / xuất</h3><label>Loại phiếu<select value={filter} onChange={event => { setFilter(event.target.value); setCursors(['']); }}><option value="">Tất cả</option><option value="IN">Nhập kho</option><option value="OUT">Xuất kho</option></select></label></div>
      {!movements.length ? <p>Chưa có phiếu kho.</p> : <div className="inventory-table"><table><thead><tr><th>Ngày</th><th>Mặt hàng</th><th>Loại</th><th>Số lượng</th><th>Tồn sau phiếu</th><th>Người thực hiện</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}>
        <td>{new Date(movement.movement_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>{movement.product_name}</td><td>{labels[movement.type]}<small>{reasons[movement.reason]}</small></td><td>{movement.quantity}</td><td>{movement.stock_after}</td><td>{movement.actor_name}</td><td>{movement.note || '—'}{movement.updated_at && <small>Đã chỉnh sửa</small>}</td>
        <td><div className="inventory-actions"><button disabled={saving} onClick={() => setEditing({ ...movement, date: String(movement.movement_date).slice(0, 10) })}>Sửa</button><button disabled={saving} onClick={() => { if (window.confirm(`Xóa phiếu ${labels[movement.type].toLowerCase()} ${movement.product_name}? Tồn kho sẽ được tính lại.`)) save(() => api('delete', `/api/business/inventory/movements/${movement.id}`)); }}>Xóa</button></div></td>
      </tr>)}</tbody></table></div>}
      <div className="inventory-actions"><button disabled={cursors.length === 1 || saving} onClick={() => setCursors(cursors.slice(0, -1))}>Trước</button><span>Trang {cursors.length}</span><button disabled={!hasMore || saving} onClick={() => setCursors([...cursors, nextCursor])}>Sau</button></div>
      <p className="inventory-muted">Sửa/xóa phiếu sẽ tính lại tồn kho. Phiếu xuất do bán hàng được chỉnh riêng về kho; doanh thu của đơn hàng vẫn giữ nguyên.</p>
    </div>}
    {isOwner && editing && <div className="inventory-dialog-backdrop"><section className="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-stock-title"><h3 id="edit-stock-title">Sửa phiếu — {editing.product_name}</h3>{failure && <div className="inventory-error" role="alert">{failure}</div>}
      <form className="inventory-form" onSubmit={event => { event.preventDefault(); save(async () => { const result = await api('put', `/api/business/inventory/movements/${editing.id}`, { type: editing.type, quantity: Number(editing.quantity), note: editing.note, date: editing.date }); setEditing(null); return result; }); }}>
        <label>Ngày<input type="date" max={vietnamDate()} required value={editing.date} onChange={event => setEditing({ ...editing, date: event.target.value })} /></label>
        <label>Loại phiếu<select value={editing.type} onChange={event => setEditing({ ...editing, type: event.target.value })}><option value="IN">Nhập kho</option><option value="OUT">Xuất kho</option></select></label>
        <label>Số lượng<input type="number" min="1" max="1000000" step="1" required value={editing.quantity} onChange={event => setEditing({ ...editing, quantity: event.target.value })} /></label>
        <label className="inventory-wide">Ghi chú<input maxLength="500" value={editing.note} onChange={event => setEditing({ ...editing, note: event.target.value })} /></label>
        <button className="inventory-primary" disabled={saving}>Lưu thay đổi</button><button type="button" disabled={saving} onClick={() => setEditing(null)}>Hủy</button>
      </form>
    </section></div>}
  </section>;
}
