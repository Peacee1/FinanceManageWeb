import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './transactionMap.css';

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
  const [tileState, setTileState] = useState('loading'), [retry, setRetry] = useState(0);
  const lastView = useRef('');
  useEffect(() => {
    setTileState('loading'); lastView.current = '';
    const instance = L.map(container.current).setView([10.7769, 106.7009], 12);
    map.current = instance; pins.current = L.layerGroup().addTo(instance);
    const sources = [
      { url: import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.de/{z}/{x}/{y}.png', maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.de/">OpenStreetMap.de</a>' },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, attribution: 'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, METI, TomTom' },
    ];
    let layer, timer, sourceIndex = 0, live = true;
    const loadSource = () => {
      clearTimeout(timer); if (layer) { instance.removeLayer(layer); layer.off(); }
      let loaded = 0;
      const failed = () => {
        if (!live || loaded) return;
        if (sourceIndex < sources.length - 1) { sourceIndex++; loadSource(); }
        else setTileState('error');
      };
      const source = sources[sourceIndex];
      layer = L.tileLayer(source.url, { maxZoom: source.maxZoom, referrerPolicy: 'strict-origin-when-cross-origin', attribution: source.attribution });
      layer.on('tileload', () => { loaded++; clearTimeout(timer); if (live) setTileState('ready'); });
      layer.on('load', () => {
        if (!loaded) { clearTimeout(timer); timer = setTimeout(failed, 0); }
      });
      layer.addTo(instance); timer = setTimeout(failed, 9000);
    };
    loadSource();
    instance.on('click', event => callback.current?.({ lat: event.latlng.lat, lng: ((event.latlng.lng + 180) % 360 + 360) % 360 - 180 }));
    const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
    return () => { live = false; clearTimeout(timer); observer.disconnect(); layer?.off(); instance.remove(); map.current = null; };
  }, [retry]);
  useEffect(() => {
    if (!map.current) return;
    pins.current.clearLayers();
    if (onPoint) {
      if (valid(point)) {
        L.circleMarker([point.lat, point.lng], { radius: 10, color: '#2563eb', fillOpacity: .8 }).addTo(pins.current);
        const key = `${point.lat}:${point.lng}`;
        if (lastView.current !== key) { map.current.setView([point.lat, point.lng], 16); lastView.current = key; }
      }
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
    const key = JSON.stringify(bounds);
    if (bounds.length && lastView.current !== key) { map.current.fitBounds(bounds, { padding: [30,30], maxZoom: 16 }); lastView.current = key; }
  }, [point, onPoint, transactions, retry]);
  return <div className="transaction-map-frame">
    <div ref={container} aria-label={onPoint ? 'Bản đồ chọn vị trí thu chi' : 'Bản đồ các điểm thu chi'} style={{ height, width: '100%', zIndex: 0 }} />
    {tileState !== 'ready' && <div className="transaction-map-status" role="status">
      {tileState === 'loading' ? <><RefreshCw size={16} />Đang tải bản đồ…</> : <><span>Chưa tải được bản đồ.</span><button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} />Thử lại</button></>}
    </div>}
  </div>;
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
export default function TransactionMap({ transactions, monthTransactions, onOpenTransactions }) {
  const [period, setPeriod] = useState('month'), [kind, setKind] = useState('all');
  const rows = (period === 'month' ? monthTransactions : transactions).filter(tx => kind === 'all' || tx.type === kind);
  const located = rows.filter(tx => valid(tx.location));
  const income = located.filter(tx => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expense = located.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  return <section className="transaction-map-page">
    <div className="transaction-map-heading"><div><h2>Bản đồ thu chi</h2><p>Nhìn lại những nơi bạn đã chi tiêu và nhận tiền.</p></div>
      <div className="transaction-map-filters">
        <label>Thời gian<select aria-label="Khoảng thời gian bản đồ" value={period} onChange={event => setPeriod(event.target.value)}><option value="month">Tháng đang chọn</option><option value="all">Tất cả thời gian</option></select></label>
        <label>Giao dịch<select aria-label="Loại thu chi trên bản đồ" value={kind} onChange={event => setKind(event.target.value)}><option value="all">Thu và chi</option><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></select></label>
      </div>
    </div>
    <div className="transaction-map-summary">
      <div><span className="map-stat-icon"><MapPin size={20} /></span><div><small>Khoản có vị trí</small><strong>{located.length}<span> / {rows.length} khoản</span></strong></div></div>
      <div><span className="map-stat-icon expense"><ArrowUpRight size={20} /></span><div><small>Chi tại các điểm</small><strong>{money(expense)}</strong></div></div>
      <div><span className="map-stat-icon income"><ArrowDownLeft size={20} /></span><div><small>Thu tại các điểm</small><strong>{money(income)}</strong></div></div>
    </div>
    <div className="transaction-map-card">
      <div className="transaction-map-card-header"><span><MapPin size={18} />Các điểm thu chi</span><div className="transaction-map-legend"><span><i className="expense" />Chi tiêu</span><span><i className="income" />Thu nhập</span><span><i className="mixed" />Thu & chi</span></div></div>
      <MapCanvas transactions={located} height="clamp(360px, 55vh, 600px)" />
      {!located.length ? <div className="transaction-map-empty"><MapPin size={24} /><div><strong>Chưa có khoản thu chi kèm vị trí</strong><p>Vào Thu chi, sửa một khoản và chọn địa điểm để hiện điểm trên bản đồ.</p></div><button type="button" className="btn-primary" onClick={onOpenTransactions}>Mở Thu chi</button></div> : <p className="transaction-map-hint">Chạm vào điểm trên bản đồ để xem số tiền và các giao dịch tại đó.</p>}
    </div>
  </section>;
}
