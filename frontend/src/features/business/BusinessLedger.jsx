import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function BusinessLedger({ businessId, onAdd }) {
  const [rows, setRows] = useState([]);
  const [cursors, setCursors] = useState(['']);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [revision, setRevision] = useState(0);
  const cursor = cursors.at(-1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    axios.get('/api/transactions', { signal: controller.signal, params: { scope: 'business', businessId, limit: 50, cursor: cursor || undefined }, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(response => { setRows(response.data); setNextCursor(response.headers['x-next-cursor'] || null); setFailure(''); })
      .catch(error => { if (!axios.isCancel(error)) setFailure(error.response?.data?.message || 'Không thể tải sổ quỹ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId, cursor, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && cursors.length === 1) setRevision(value => value + 1); };
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [cursors.length]);
  const currency = amount => `${Number(amount).toLocaleString('vi-VN')} ₫`;
  return <div className="inventory inventory-card">
    <div className="inventory-heading"><h3>Sổ quỹ doanh nghiệp</h3><div className="inventory-actions"><button onClick={() => setRevision(value => value + 1)} disabled={loading}>Làm mới</button><button className="inventory-primary" onClick={onAdd}>Thêm thu / chi</button></div></div>
    {failure && <div role="alert">{failure}</div>}
    {loading ? <p role="status">Đang tải...</p> : !rows.length ? <p>Chưa có giao dịch.</p> : <div className="inventory-table"><table><thead><tr><th>Ngày</th><th>Danh mục</th><th>Nội dung</th><th>Hình thức</th><th>Số tiền</th></tr></thead><tbody>{rows.map(tx => <tr key={tx.id}>
      <td>{new Date(tx.date).toLocaleDateString('vi-VN')}</td><td>{tx.category}</td><td>{tx.description}</td><td>{tx.payment_method === 'CASH' ? 'Tiền mặt' : tx.payment_method === 'TRANSFER' ? 'Chuyển khoản' : 'Chưa ghi nhận'}</td><td style={{ color: tx.type === 'INCOME' ? 'var(--color-income)' : 'var(--color-expense)', whiteSpace: 'nowrap' }}>{tx.type === 'INCOME' ? '+' : '-'}{currency(tx.amount)}</td>
    </tr>)}</tbody></table></div>}
    <div className="inventory-actions"><button disabled={cursors.length === 1 || loading} onClick={() => setCursors(cursors.slice(0, -1))}>Trước</button><span>Trang {cursors.length}</span><button disabled={!nextCursor || loading} onClick={() => setCursors([...cursors, nextCursor])}>Sau</button></div>
  </div>;
}
