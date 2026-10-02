import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FamilyDialog from './FamilyDialog';
export default function FamilySettings() {
  const [data, setData] = useState(null), [name, setName] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const [action, setAction] = useState(null), [dissolving, setDissolving] = useState(false), [purchaseId, setPurchaseId] = useState(null);
  useEffect(() => { axios.get('/api/users/family', config()).then(result => setData(result.data)).catch(() => setError('Không thể tải thông tin Gia đình.')); }, []);
  const submit = async (event, action) => {
    event.preventDefault(); setError(''); setAction(action);
  };
  const enter = async syncPersonal => {
    setBusy(true); setError('');
    try { await axios.post(`/api/users/family/${action}`, { ...(action === 'create' ? { name } : { inviteCode: code.trim() }), syncPersonal }, config()); window.location.reload(); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể cập nhật Gia đình.'); setBusy(false); }
  };
  const dissolve = async () => {
    setBusy(true); setError('');
    try { await axios.post(data.family.is_creator ? '/api/users/family/dissolve' : '/api/users/family/leave', {}, config()); window.location.reload(); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể giải tán Gia đình.'); setBusy(false); }
  };
  const buySlot = async () => {
    setBusy(true); setError('');
    try {
      await axios.post('/api/users/family/buy-slot', { requestId: purchaseId }, config());
      const refreshed = await axios.get('/api/users/family', config()); setData(refreshed.data); setPurchaseId(null);
    } catch (failure) { setError(failure.response?.data?.message || 'Không thể mua slot. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  return <section className="card" style={{ padding: 24, maxWidth: 720 }}>
    <h2>Peacee1 Gia đình</h2><p>Các thành viên dùng chung một lịch, tổng thu chi, ngân sách và mục tiêu. Mặc định có 2 slot; thêm mỗi tài khoản với 1.500 xu.</p>
    {action && <FamilyDialog title="Đồng bộ Cá nhân với Gia đình" busy={busy} error={error} onYes={() => enter(true)} onNo={() => enter(false)} onCancel={() => setAction(null)}><p>Bạn có muốn đồng bộ dữ liệu Cá nhân với Gia đình không?</p><p>Chọn Có để sao chép thu chi cá nhân hiện có vào lịch Gia đình. Chọn Không để sử dụng sổ chung riêng. Dữ liệu cá nhân gốc vẫn được giữ lại.</p></FamilyDialog>}
    {dissolving && <FamilyDialog title={data.family.is_creator ? 'Giải tán Gia đình?' : 'Rời Gia đình?'} busy={busy} error={error} onYes={dissolve} onNo={() => setDissolving(false)}><p>{data.family.is_creator ? 'Tất cả thành viên sẽ trở về chế độ Cá nhân.' : 'Bạn sẽ trở về chế độ Cá nhân; các thành viên khác tiếp tục dùng Gia đình.'} Sau đó sẽ có hộp thoại chọn đồng bộ các khoản đã nhập về lịch Cá nhân.</p></FamilyDialog>}
    {purchaseId && <FamilyDialog title="Mua thêm một slot Gia đình?" busy={busy} error={error} onYes={buySlot} onNo={() => setPurchaseId(null)}><p>Trừ 1.500 xu từ tài khoản của bạn để Gia đình có thêm một slot mời thành viên. Slot thuộc Gia đình này.</p></FamilyDialog>}
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Đang tải...</p>}
    {data?.family ? <>
      <h3>{data.family.name}</h3><p>Chế độ Gia đình · {data.family.members.length}/{data.family.member_capacity} tài khoản</p>
      <ul>{data.family.members.map(member => <li key={member.id}>{member.name}</li>)}</ul>
      {data.family.members.length < data.family.member_capacity && <label>Mã mời thành viên<input readOnly value={data.family.invite_code} onFocus={event => event.target.select()} style={{ width: '100%', padding: 12 }} /></label>}
      <p>Cả hai thành viên có thể thêm, sửa và xóa thu chi chung. Tài khoản Gia đình chỉ sử dụng sổ Gia đình.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => { setError(''); setPurchaseId(crypto.randomUUID()); }}>Mua thêm slot · 1.500 xu</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setError(''); setDissolving(true); }}>{data.family.is_creator ? 'Giải tán Gia đình' : 'Rời Gia đình'}</button>
      </div>
    </> : data && <>
      <p>Bạn đang dùng Cá nhân. Khi tạo hoặc tham gia Gia đình, bạn có thể chọn đồng bộ thu chi cá nhân vào sổ chung. Khi giải tán, cả hai thành viên trở về Cá nhân.</p>
      <form onSubmit={event => submit(event, 'create')} style={{ marginTop: 24 }}>
        <label htmlFor="family-name">Tên gia đình</label><input id="family-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} style={{ width: '100%', padding: 12, margin: '8px 0' }} />
        <button className="btn-primary" disabled={busy}>Tạo Gia đình và chuyển sang sổ chung</button>
      </form>
      <form onSubmit={event => submit(event, 'join')} style={{ marginTop: 24 }}>
        <label htmlFor="family-code">Mã mời từ người thân</label><input id="family-code" required value={code} onChange={event => setCode(event.target.value)} style={{ width: '100%', padding: 12, margin: '8px 0' }} />
        <button className="btn-primary" disabled={busy}>Tham gia Gia đình</button>
      </form>
    </>}
  </section>;
}
