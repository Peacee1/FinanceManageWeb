import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function currentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Thiết bị không hỗ trợ vị trí. Bạn có thể chọn điểm trên bản đồ.'));
    navigator.geolocation.getCurrentPosition(position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }), error => reject(new Error(error.code === 1 ? 'Bạn chưa cho phép truy cập vị trí. Có thể cấp quyền trong trình duyệt hoặc chọn điểm thủ công.' : 'Không lấy được vị trí hiện tại. Bạn có thể chọn điểm thủ công.')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  });
}
const valid = point => point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function MapCanvas({ point, onPoint, transactions = [], height = 320 }) {
  const container = useRef(null), map = useRef(null), pins = useRef(null), callback = useRef(onPoint);
  callback.current = onPoint;
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    const instance = L.map(container.current).setView([10.7769, 106.7009], 12);
    map.current = instance; pins.current = L.layerGroup().addTo(instance);
    L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => setTileError(true)).addTo(instance);
    instance.on('click', event => callback.current?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
    const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    pins.current.clearLayers();
    if (onPoint) {
      if (valid(point)) { L.circleMarker([point.lat, point.lng], { radius: 10, color: '#2563eb', fillOpacity: .8 }).addTo(pins.current); map.current.setView([point.lat, point.lng], 16); }
      return;
    }
    const groups = new Map();
    for (const tx of transactions) {
      if (!valid(tx.location)) continue;
      const key = `${tx.location.lat.toFixed(5)}:${tx.location.lng.toFixed(5)}`;
      if (!groups.has(key)) groups.set(key, { point: tx.location, rows: [] });
      groups.get(key).rows.push(tx);
    }
    const bounds = [];
    for (const group of groups.values()) {
      const income = group.rows.filter(tx => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
      const expense = group.rows.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
      const content = document.createElement('div');
      const heading = document.createElement('strong'); heading.textContent = group.point.label || 'Điểm thu chi'; content.append(heading);
      const totals = document.createElement('p'); totals.textContent = `Thu: ${money(income)} · Chi: ${money(expense)}`; content.append(totals);
      for (const tx of group.rows) { const row = document.createElement('p'); row.textContent = `${new Date(tx.date).toLocaleDateString('vi-VN')} · ${tx.type === 'INCOME' ? '+' : '−'}${money(tx.amount)} · ${tx.description || tx.category}`; content.append(row); }
      content.style.maxHeight = '250px'; content.style.overflowY = 'auto';
      const coordinates = [group.point.lat, group.point.lng]; bounds.push(coordinates);
      L.circleMarker(coordinates, { radius: Math.min(20, 8 + Math.sqrt(group.rows.length) * 2), color: income && expense ? '#7c3aed' : income ? '#059669' : '#e11d48', fillOpacity: .75 }).bindPopup(content).addTo(pins.current);
    }
    if (bounds.length) map.current.fitBounds(bounds, { padding: [30,30], maxZoom: 16 });
  }, [point, onPoint, transactions]);
  return <>{tileError && <p role="status">Không tải được nền bản đồ. Bạn vẫn có thể nhập tọa độ hoặc thử lại khi có mạng.</p>}<div ref={container} aria-label={onPoint ? 'Bản đồ chọn vị trí thu chi' : 'Bản đồ các điểm thu chi'} style={{ height, width: '100%', borderRadius: 12, zIndex: 0 }} /></>;
}
export function LocationPicker({ value, onChange, autoLocate }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef(0), changed = useRef(false), change = useRef(onChange);
  change.current = onChange;
  const locate = async () => {
    const id = ++request.current; setBusy(true); setError(''); changed.current = false;
    try { const point = await currentLocation(); if (request.current === id && !changed.current) change.current(point); }
    catch (failure) { if (request.current === id) setError(failure.message); }
    finally { if (request.current === id) setBusy(false); }
  };
  useEffect(() => { if (autoLocate) locate(); return () => { request.current++; }; }, [autoLocate]);
  const choose = point => { changed.current = true; onChange(point); };
  return <div className="input-group">
    <label>Vị trí thu chi (tuỳ chọn)</label>
    <p>Chạm vào bản đồ để đổi vị trí. Vị trí chỉ được lưu khi bạn lưu khoản thu chi.</p>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button type="button" className="btn-secondary" disabled={busy} onClick={locate}>{busy ? 'Đang lấy vị trí…' : 'Vị trí hiện tại'}</button><button type="button" className="btn-secondary" onClick={() => choose(null)}>Bỏ vị trí</button></div>
    {error && <p role="status">{error}</p>}
    <MapCanvas point={value} onPoint={choose} />
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <label>Vĩ độ<input type="number" min="-90" max="90" step="any" value={value?.lat ?? ''} onChange={event => { if (event.target.value !== '' && Math.abs(Number(event.target.value)) <= 90) choose({ ...value, lat: Number(event.target.value), lng: value?.lng ?? 106.7009 }); }} /></label>
      <label>Kinh độ<input type="number" min="-180" max="180" step="any" value={value?.lng ?? ''} onChange={event => { if (event.target.value !== '' && Math.abs(Number(event.target.value)) <= 180) choose({ ...value, lng: Number(event.target.value), lat: value?.lat ?? 10.7769 }); }} /></label>
    </div>
    {value && <input aria-label="Tên địa điểm" maxLength={200} placeholder="Tên địa điểm (tuỳ chọn)" value={value.label || ''} onChange={event => choose({ ...value, label: event.target.value })} />}
  </div>;
}
export default function TransactionMap({ transactions, monthTransactions }) {
  const [period, setPeriod] = useState('month'), [kind, setKind] = useState('all');
  const rows = (period === 'month' ? monthTransactions : transactions).filter(tx => kind === 'all' || tx.type === kind);
  const located = rows.filter(tx => valid(tx.location));
  return <section className="widget" style={{ padding: 20 }}>
    <h2>Bản đồ thu chi</h2><p>Đỏ: Chi tiêu · Xanh: Thu nhập · Tím: Có cả thu và chi. Chạm vào điểm để xem chi tiết.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
      <select aria-label="Khoảng thời gian bản đồ" value={period} onChange={event => setPeriod(event.target.value)}><option value="month">Tháng đang chọn</option><option value="all">Tất cả thời gian</option></select>
      <select aria-label="Loại thu chi trên bản đồ" value={kind} onChange={event => setKind(event.target.value)}><option value="all">Thu và chi</option><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></select>
    </div>
    <p>{located.length}/{rows.length} khoản có vị trí.{!located.length && ' Thêm vị trí khi tạo hoặc sửa thu chi để hiện điểm trên bản đồ.'}</p>
    <MapCanvas transactions={located} height="min(70vh, 700px)" />
  </section>;
}
