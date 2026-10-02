import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FamilyDialog from './FamilyDialog';
export default function FamilyDissolutionPrompt() {
  const [pending, setPending] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  useEffect(() => {
    let live = true;
    const load = () => { if (!document.hidden) axios.get('/api/users/family', config()).then(response => { if (live) setPending(response.data.pending || []); }).catch(() => {}); };
    load(); const timer = setInterval(load, 10000); window.addEventListener('focus', load);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  const resolve = async syncData => {
    setBusy(true); setError('');
    try { await axios.post('/api/users/family/resolve-dissolution', { noticeId: pending[0].id, syncData }, config()); window.location.reload(); }
    catch (failure) { setError(failure.response?.data?.message || 'Không thể lưu lựa chọn. Vui lòng thử lại.'); setBusy(false); }
  };
  if (!pending.length) return null;
  return <FamilyDialog title={pending[0].event_type === 'left' ? 'Bạn đã rời Gia đình' : 'Gia đình đã bị giải tán'} busy={busy} error={error} onYes={() => resolve(true)} onNo={() => resolve(false)}>
    <p>{pending[0].event_type === 'left' ? `Bạn đã rời Gia đình “${pending[0].name}”.` : `Gia đình “${pending[0].name}” đã bị giải tán.`} Bạn có muốn đồng bộ dữ liệu đã nhập lên Gia đình với lịch Cá nhân không?</p>
    <p>Chọn Có để sao chép các khoản do chính bạn nhập trong Gia đình về lịch Cá nhân. Các khoản đã đồng bộ từ Cá nhân trước đó sẽ không được cộng trùng.</p>
  </FamilyDialog>;
}
