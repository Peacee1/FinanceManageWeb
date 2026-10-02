import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { MapPin, ArrowDownLeft, ArrowUpRight, RefreshCw, Maximize2, Minimize2, GripHorizontal, LocateFixed } from 'lucide-react';
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

function MapCanvas({ point, onPoint, transactions = [], height = 320, resizable = false }) {
  const container = useRef(null), map = useRef(null), pins = useRef(null), callback = useRef(onPoint);
  callback.current = onPoint;
  const [tileState, setTileState] = useState('loading'), [retry, setRetry] = useState(0);
  const lastView = useRef('');
  const [mapHeight, setMapHeight] = useState(() => Math.max(520, Math.round(window.innerHeight * .75)));
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false), [locationError, setLocationError] = useState('');
  const selfLocation = useRef(null), locationRequest = useRef(0);
  const drag = useRef(null);
  const locateSelf = async () => {
    const id = ++locationRequest.current;
    setLocating(true); setLocationError('');
    try {
      const point = await currentLocation();
      if (!map.current || locationRequest.current !== id) return;
      if (selfLocation.current) map.current.removeLayer(selfLocation.current);
      selfLocation.current = L.circleMarker([point.lat,point.lng], { radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1 }).bindPopup('Vị trí hiện tại của bạn').addTo(map.current);
      map.current.setView([point.lat,point.lng],16);
    } catch (error) { if (locationRequest.current === id && map.current) setLocationError(error.message); }
    finally { if (locationRequest.current === id && map.current) setLocating(false); }
  };
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape') setExpanded(false); };
    if (expanded) document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [expanded]);
  useEffect(() => {
    setTileState('loading'); setLocating(false); lastView.current = '';
    const instance = L.map(container.current, { scrollWheelZoom: !resizable }).setView([10.7769, 106.7009], 12);
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
    return () => { live = false; locationRequest.current++; selfLocation.current=null; clearTimeout(timer); observer.disconnect(); layer?.off(); instance.remove(); map.current = null; };
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
  return <div className={`map-canvas-shell ${expanded ? 'map-canvas-expanded' : ''}`}>
    <div className="transaction-map-frame" style={{ height: expanded ? 'calc(100dvh - 70px)' : resizable ? mapHeight : height }}>
    <div ref={container} aria-label={onPoint ? 'Bản đồ chọn vị trí thu chi' : 'Bản đồ các điểm thu chi'} style={{ height: '100%', width: '100%', zIndex: 0 }} />
    {resizable && <div className="map-action-buttons">
      <button type="button" disabled={locating} aria-label="Định vị tôi" onClick={locateSelf}><LocateFixed size={17} />{locating ? 'Đang định vị…' : 'Định vị tôi'}</button>
      <button type="button" aria-label={expanded ? 'Thu gọn bản đồ' : 'Phóng rộng bản đồ'} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{expanded ? 'Thu gọn' : 'Phóng rộng'}</button>
    </div>}
    {locationError && <div className="map-location-error" role="status">{locationError}</div>}
    {tileState !== 'ready' && <div className="transaction-map-status" role="status">
      {tileState === 'loading' ? <><RefreshCw size={16} />Đang tải bản đồ…</> : <><span>Chưa tải được bản đồ.</span><button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} />Thử lại</button></>}
    </div>}
    </div>
    {resizable && !expanded && <button type="button" className="map-resize-handle" aria-label="Kéo để thay đổi chiều cao bản đồ; dùng phím lên xuống để điều chỉnh" onPointerDown={event => { drag.current = { y: event.clientY, height: mapHeight }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (drag.current) setMapHeight(Math.max(400,Math.min(1600,drag.current.height + event.clientY-drag.current.y))); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={event => { if (['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); setMapHeight(value => Math.max(400,Math.min(1600,value + (event.key === 'ArrowDown' ? 80 : -80)))); } }}><GripHorizontal size={18} />Kéo xuống để mở rộng bản đồ</button>}
  </div>;
}
export function LocationPicker({ value, onChange, autoLocate }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [places,setPlaces] = useState([]), [placeError,setPlaceError] = useState(''), [saving,setSaving] = useState(false), [selected,setSelected] = useState('');
  const [placeNotice,setPlaceNotice] = useState('');
  const config = () => ({headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
  useEffect(() => {
    let live=true;
    axios.get('/api/users/saved-locations',config()).then(response=>{if(live) setPlaces(response.data);}).catch(()=>{if(live) setPlaceError('Không tải được địa điểm đã lưu. Bạn vẫn có thể chọn trên bản đồ.');});
    return ()=>{live=false;};
  },[]);
  const request = useRef(0), changed = useRef(false), change = useRef(onChange);
  change.current = onChange;
  const locate = async () => {
    const id = ++request.current; setBusy(true); setError(''); changed.current = false;
    try { const point = await currentLocation(); if (request.current === id && !changed.current) change.current(point); }
    catch (failure) { if (request.current === id) setError(failure.message); }
    finally { if (request.current === id) setBusy(false); }
  };
  useEffect(() => { if (autoLocate) locate(); return () => { request.current++; }; }, [autoLocate]);
  const choose = point => { changed.current = true; setSelected(''); setPlaceNotice(''); onChange(point); };
  const savePlace = async () => {
    setSaving(true); setPlaceError(''); setPlaceNotice('');
    try {
      const response=await axios.post('/api/users/saved-locations',{name:value.label.trim(),lat:value.lat,lng:value.lng},config());
      setPlaces(current=>[response.data,...current.filter(place=>place.id!==response.data.id)]);
      setSelected(String(response.data.id)); setPlaceNotice('Đã lưu địa điểm. Bạn có thể chọn nhanh cho các khoản sau.');
    } catch(failure) { setPlaceError(failure.response?.data?.message || 'Không lưu được địa điểm. Hãy thử lại.'); }
    finally {setSaving(false);}
  };
  const removePlace = async () => {
    setSaving(true); setPlaceError(''); setPlaceNotice('');
    try {await axios.delete(`/api/users/saved-locations/${selected}`,config()); setPlaces(current=>current.filter(place=>String(place.id)!==selected)); setSelected(''); setPlaceNotice('Đã xóa khỏi địa điểm đã lưu.');}
    catch(failure) {setPlaceError(failure.response?.data?.message || 'Không xóa được địa điểm.');}
    finally {setSaving(false);}
  };
  return <div className="input-group">
    <label>Vị trí thu chi (tuỳ chọn)</label>
    <div className="saved-place-controls">
      <label>Chọn nhanh địa điểm đã lưu<select aria-label="Địa điểm đã lưu" value={selected} disabled={saving} onChange={event=>{
        const place=places.find(item=>String(item.id)===event.target.value);
        if(place) choose({lat:place.lat,lng:place.lng,label:place.name});
        setSelected(event.target.value);
      }}><option value="">{places.length ? 'Chọn Nhà riêng, Công ty, Chợ…' : 'Chưa có địa điểm đã lưu'}</option>{places.map(place=><option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
      {selected && <button type="button" className="btn-secondary" disabled={saving} onClick={removePlace}>Xóa địa điểm đã lưu</button>}
    </div>
    {placeError && <p role="alert">{placeError}</p>}
    {placeNotice && <p role="status">{placeNotice}</p>}
    <p>Chạm vào bản đồ để đổi vị trí. Vị trí chỉ được lưu khi bạn lưu khoản thu chi.</p>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><button type="button" className="btn-secondary" disabled={busy} onClick={locate}>{busy ? 'Đang lấy vị trí…' : 'Vị trí hiện tại'}</button><button type="button" className="btn-secondary" onClick={() => choose(null)}>Bỏ vị trí</button></div>
    {error && <p role="status">{error}</p>}
    <MapCanvas point={value} onPoint={choose} />
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <label>Vĩ độ<input type="number" min="-90" max="90" step="any" value={value?.lat ?? ''} onChange={event => { if (event.target.value !== '' && Math.abs(Number(event.target.value)) <= 90) choose({ ...value, lat: Number(event.target.value), lng: value?.lng ?? 106.7009 }); }} /></label>
      <label>Kinh độ<input type="number" min="-180" max="180" step="any" value={value?.lng ?? ''} onChange={event => { if (event.target.value !== '' && Math.abs(Number(event.target.value)) <= 180) choose({ ...value, lng: Number(event.target.value), lat: value?.lat ?? 10.7769 }); }} /></label>
    </div>
    {value && <div className="saved-place-controls"><label>Tên địa điểm<input aria-label="Tên địa điểm" maxLength={100} list="location-name-suggestions" placeholder="Nhà riêng, Công ty, Chợ…" value={value.label || ''} onChange={event => choose({ ...value, label: event.target.value })} /></label><button type="button" className="btn-secondary" disabled={saving || !valid(value) || !value.label?.trim()} onClick={savePlace}>{saving ? 'Đang lưu…' : 'Lưu địa điểm'}</button><small>Lưu cùng tên sẽ cập nhật vị trí đã lưu. Khoản thu chi chỉ được lưu khi bạn hoàn tất biểu mẫu.</small></div>}
    <datalist id="location-name-suggestions"><option value="Nhà riêng"/><option value="Công ty"/><option value="Chợ"/><option value="Siêu thị"/></datalist>
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
      <MapCanvas transactions={located} resizable />
      {!located.length ? <div className="transaction-map-empty"><MapPin size={24} /><div><strong>Chưa có khoản thu chi kèm vị trí</strong><p>Vào Thu chi, sửa một khoản và chọn địa điểm để hiện điểm trên bản đồ.</p></div><button type="button" className="btn-primary" onClick={onOpenTransactions}>Mở Thu chi</button></div> : <p className="transaction-map-hint">Chạm vào điểm trên bản đồ để xem số tiền và các giao dịch tại đó.</p>}
    </div>
  </section>;
}
