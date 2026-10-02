import React, { useEffect, useState } from 'react';
import axios from 'axios';
export default function FamilySettings() {
  const [data, setData] = useState(null), [name, setName] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  useEffect(() => { axios.get('/api/users/family', config()).then(result => setData(result.data)).catch(() => setError('Không thể tải thông tin Gia đình.')); }, []);
  const submit = async (event, action) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await axios.post(`/api/users/family/${action}`, action === 'create' ? { name } : { inviteCode: code.trim() }, config()); window.location.reload(); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể cập nhật Gia đình.'); setBusy(false); }
  };
  return <section className="card" style={{ padding: 24, maxWidth: 720 }}>
    <h2>Peacee1 Gia đình</h2><p>Hai tài khoản dùng chung một lịch, tổng thu chi, ngân sách và mục tiêu.</p>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Đang tải...</p>}
    {data?.family ? <>
      <h3>{data.family.name}</h3><p>Chế độ Gia đình · {data.family.members.length}/2 tài khoản</p>
      <ul>{data.family.members.map(member => <li key={member.id}>{member.name}</li>)}</ul>
      {data.family.members.length < 2 && <label>Mã mời người thứ hai<input readOnly value={data.family.invite_code} onFocus={event => event.target.select()} style={{ width: '100%', padding: 12 }} /></label>}
      <p>Cả hai thành viên có thể thêm, sửa và xóa thu chi chung. Tài khoản Gia đình chỉ sử dụng sổ Gia đình.</p>
    </> : data && <>
      <p>Bạn đang dùng Cá nhân. Khi tạo hoặc tham gia Gia đình, bạn sẽ chuyển sang sổ chung. Thu chi cá nhân cũ được giữ riêng và không cộng vào Gia đình. Việc chuyển chế độ chưa hỗ trợ quay lại Cá nhân.</p>
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
