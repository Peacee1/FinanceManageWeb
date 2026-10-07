import {Text} from './i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {} from 'react-native';
import * as Crypto from 'expo-crypto';
import type { Api } from './api';
import { Button, Card, Field, Label, Sheet, Spinner, useTheme } from './ui';

type FamilyData = {
  family: null | { name: string; invite_code: string; member_capacity: number; is_creator: boolean; members: { id: number; name: string }[] };
  pending: { id: number; name: string; event_type: string }[];
};
export default function FamilyScreen({ api, onClose, onChanged }: { api: Api; onClose: () => void; onChanged: () => Promise<void> }) {
  const c = useTheme();
  const [data, setData] = useState<FamilyData | null>(null);
  const [name, setName] = useState(''), [code, setCode] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [action, setAction] = useState<'create' | 'join' | 'exit' | 'buy' | null>(null);
  const pending = useRef(false), purchaseId = useRef<string | null>(null);
  const load = useCallback(async () => { const response = await api<FamilyData>('/users/family'); setData(response.data); }, [api]);
  useEffect(() => { let active = true; api<FamilyData>('/users/family').then(response => { if (active) setData(response.data); }).catch(failure => { if (active) setError(failure.message); }); return () => { active = false; }; }, [api]);
  const perform = async (path: string, body: unknown) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await api(path, 'POST', body); await load(); await onChanged(); setAction(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không cập nhật được Gia đình.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const enter = (syncPersonal: boolean) => perform(`/users/family/${action}`, action === 'create' ? { name: name.trim(), syncPersonal } : { inviteCode: code.trim(), syncPersonal });
  const family = data?.family, notice = data?.pending[0];
  return <Sheet title="Gia đình" onClose={() => { if (!pending.current) onClose(); }}>
    <Label muted>Dùng chung lịch, thu chi và mục tiêu. Khi ở chế độ Gia đình, bạn sử dụng sổ chung thay cho sổ Cá nhân.</Label>
    {!!error && <Text accessibilityRole="alert" style={{ color: c.expense }}>{error}</Text>}
    {!data && !error && <Spinner />}
    {!data && !!error && <Button title="Thử lại" secondary onPress={() => { setError(''); load().catch(failure => setError(failure.message)); }} />}
    {notice ? <Card><Label large>{notice.event_type === 'left' ? 'Bạn đã rời Gia đình' : 'Gia đình đã giải tán'}</Label><Label>Bạn có muốn đồng bộ các khoản mình đã nhập vào {notice.name} về lịch Cá nhân không?</Label><Button disabled={busy} title="Có, đồng bộ" onPress={() => perform('/users/family/resolve-dissolution', { noticeId: notice.id, syncData: true })} /><Button disabled={busy} secondary title="Không đồng bộ" onPress={() => perform('/users/family/resolve-dissolution', { noticeId: notice.id, syncData: false })} /></Card> : action ? <Card>
      {action === 'create' || action === 'join' ? <><Label large>Đồng bộ Cá nhân với Gia đình?</Label><Label>Chọn Có để sao chép thu chi cá nhân vào sổ chung. Dữ liệu cá nhân gốc vẫn được giữ lại.</Label><Button disabled={busy} title="Có, đồng bộ" onPress={() => enter(true)} /><Button disabled={busy} secondary title="Không, dùng sổ chung riêng" onPress={() => enter(false)} /></> : <><Label large>{action === 'buy' ? 'Mua thêm slot · 1.500 xu?' : family?.is_creator ? 'Giải tán Gia đình?' : 'Rời Gia đình?'}</Label><Label>{action === 'buy' ? 'Trừ 1.500 xu từ tài khoản của bạn để thêm chỗ cho một thành viên.' : family?.is_creator ? 'Tất cả thành viên sẽ trở về Cá nhân và được chọn đồng bộ dữ liệu.' : 'Bạn trở về Cá nhân và được chọn đồng bộ dữ liệu. Các thành viên khác tiếp tục dùng sổ chung.'}</Label><Button disabled={busy} title={busy ? 'Đang xử lý…' : 'Xác nhận'} onPress={() => action === 'buy' ? perform('/users/family/buy-slot', { requestId: purchaseId.current }) : perform(`/users/family/${family?.is_creator ? 'dissolve' : 'leave'}`, {})} /></>}
      <Button disabled={busy} secondary title="Hủy" onPress={() => { setAction(null); setError(''); }} />
    </Card> : family ? <><Card><Label large translateContent={false}>{family.name}</Label><Label muted>{`${family.members.length}/${family.member_capacity} thành viên`}</Label>{family.members.map(member => <Label key={member.id} translateContent={false}>{member.name}</Label>)}{family.members.length < family.member_capacity && <><Label muted>Mã mời — nhấn giữ để sao chép</Label><Text selectable style={{ color: c.text }}>{family.invite_code}</Text></>}</Card><Button title="Mua thêm slot · 1.500 xu" onPress={() => { purchaseId.current = Crypto.randomUUID(); setAction('buy'); }} /><Button secondary title={family.is_creator ? 'Giải tán Gia đình' : 'Rời Gia đình'} onPress={() => setAction('exit')} /></> : data ? <><Card><Label large>Tạo Gia đình</Label><Label muted>Mặc định có 2 chỗ cho thành viên.</Label><Field label="Tên gia đình" value={name} onChange={setName} /><Button title="Tạo Gia đình" disabled={!name.trim() || name.trim().length > 100} onPress={() => setAction('create')} /></Card><Card><Label large>Tham gia Gia đình</Label><Field label="Mã mời từ người thân" value={code} onChange={setCode} autoCapitalize="none" /><Button title="Tham gia" disabled={!code.trim()} onPress={() => setAction('join')} /></Card></> : null}
  </Sheet>;
}




