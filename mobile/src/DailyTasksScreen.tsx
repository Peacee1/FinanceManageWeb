import React, {useEffect,useRef,useState} from 'react';
import {AppState,View} from 'react-native';
import {useMobile} from '../App';
import Feather from '@expo/vector-icons/Feather';
import type {Api} from './api';
import type {Profile,Summary} from './types';
import {checkinProgress,checkinWeek} from './dailyTasks';
import {currencyTotals,today} from './format';
import {Text,useTranslate} from './i18n';
import {Button,Card,Label,Sheet,Spinner,styles,useTheme} from './ui';

export default function DailyTasksScreen({api,onClose,onChanged,onAdd,onHistory}:{api:Api;onClose:()=>void;onChanged:()=>Promise<void>;onAdd:()=>void;onHistory:()=>void}){
  const {reminderStatus,enableReminders}=useMobile();const c=useTheme(),t=useTranslate();
  const [day,setDay]=useState(today),[profile,setProfile]=useState<Profile|null>(null),[summary,setSummary]=useState<Summary|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
  const pending=useRef(false);
  useEffect(()=>{const timer=setInterval(()=>setDay(today()),30000);const listener=AppState.addEventListener('change',state=>{if(state==='active'){setDay(today());setReload(value=>value+1);}});return()=>{clearInterval(timer);listener.remove();};},[]);
  useEffect(()=>{let active=true;api<Profile>('/users/me').then(async({data:p})=>{const [year,month]=day.split('-').map(Number);const {data:s}=await api<Summary>(`/transactions/summary?scope=${p.finance_mode}&year=${year}&month=${month}`);if(active){setProfile(p);setSummary(s);setError('');}}).catch(failure=>{if(active)setError(failure.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[api,day,reload]);
  const state=checkinProgress(profile?.last_checkin_date,profile?.checkin_streak||0,day);
  const recorded=(summary?.by_currency||[summary]).some(row=>Number(row?.today_income||0)>0||Number(row?.today_expense||0)>0);
  const completed=Number(state.done)+Number(recorded);
  const claim=async()=>{if(pending.current||state.done)return;pending.current=true;setBusy(true);setError('');setMessage('');try{const {data}=await api<{addedCoin:number}>('/users/checkin','POST',{});setMessage(`${t('Đã nhận thưởng')}: +${data.addedCoin} ${t('xu')}`);setReload(value=>value+1);await onChanged();}catch(failure){setError(failure instanceof Error?failure.message:t('Thử lại'));setReload(value=>value+1);}finally{pending.current=false;setBusy(false);}};
  return <Sheet title="Điểm danh hằng ngày" onClose={()=>{if(!pending.current)onClose();}}>
    <Label muted>Tiến độ được cập nhật từ sổ thu chi thật. Điểm danh nhận xu một lần mỗi ngày.</Label>
    <Card><Label>Nhắc nhở trên điện thoại</Label><Label muted>07:00 — Điểm danh · 21:00 — Ghi khoản chi (theo giờ điện thoại)</Label>{reminderStatus==='web'?<Label muted>Cần mở app trên điện thoại để nhận thông báo.</Label>:reminderStatus==='enabled'?<Label muted>Đã bật nhắc nhở hằng ngày.</Label>:<><Label muted>Cấp quyền thông báo để nhận lời nhắc.</Label><Button title="Bật thông báo" onPress={()=>{void enableReminders();}}/></>}</Card>
    {!!error&&<Card><Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text><Button title="Thử lại" secondary disabled={busy} onPress={()=>{setLoading(true);setReload(value=>value+1);}}/></Card>}
    {!!message&&<Text style={{color:c.primary}}>{message}</Text>}
    {loading?<Spinner/>:profile&&summary?<>
      <Card><View style={styles.row}><Label large>{day.split('-').reverse().join('/')}</Label><Label translateContent={false}>{completed}/2 {t('Hoàn thành')}</Label></View><View style={{height:8,borderRadius:4,backgroundColor:c.bg}}><View style={{height:8,borderRadius:4,width:`${completed/2*100}%`,backgroundColor:c.primary}}/></View><Label translateContent={false}>{t('Chuỗi điểm danh')}: {state.currentStreak} {t('ngày')}</Label></Card>
      <View style={{backgroundColor:c.card,borderRadius:24,borderWidth:1,borderColor:c.border,padding:20,gap:20}}>
        <View style={styles.row}><View style={{flex:1,gap:4}}><Label>Điểm danh nhận quà</Label><Text style={{color:c.muted,fontSize:11}} translateContent={false}>{t('Hôm nay')}: +{state.reward} {t('xu')}</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.primary+'18',paddingHorizontal:12,paddingVertical:7,borderRadius:20}}><Feather name="database" size={13} color={c.primary}/><Text style={{color:c.primary,fontSize:13,fontWeight:'700'}} translateContent={false}>{Number(profile.coin||0).toLocaleString('en-US')}</Text></View></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:14,backgroundColor:c.primary+'12'}}><Text style={{fontSize:30}}>🔥</Text><View style={{flex:1}}><Label>Điểm danh liên tục</Label><Text style={{fontSize:22,fontWeight:'800',color:c.primary}} translateContent={false}>{state.currentStreak} {t('ngày')}</Text></View></View>
        <View style={{flexDirection:'row',gap:6}}>{checkinWeek(day,profile.last_checkin_date,profile.checkin_streak||0).map(item=>{const active=item.date===day;return <View key={item.date} style={{flex:1,alignItems:'center',gap:8}}><View style={{width:'100%',aspectRatio:1,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:item.claimed?c.primary:c.bg,borderWidth:active&&!item.claimed?2:0,borderColor:c.primary,opacity:item.date<day&&!item.claimed?0.45:1}}>{item.claimed?<Feather name="check" size={20} color="white"/>:active?<Text translateContent={false} style={{fontSize:11,fontWeight:'800',color:c.primary}}>+{state.reward}</Text>:<Feather name={item.label==='CN'?'award':'gift'} size={17} color={c.muted}/>}</View><Text style={{fontSize:10,fontWeight:'700',color:active||item.claimed?c.primary:c.muted}}>{item.label}</Text></View>;})}</View>
        <Button disabled={busy||state.done} title={state.done?'Đã nhận thưởng':busy?'Đang xử lý…':'Điểm danh ngay'} onPress={claim}/>
      </View>
      <Card><View style={styles.row}><View style={{flex:1}}><Label large>Ghi nhận thu chi hôm nay</Label></View><Feather name={recorded?'check-circle':'edit-3'} size={24} color={c.primary}/></View><Label muted>Chỉ ghi các khoản thực tế đã phát sinh. Nhiệm vụ này không thưởng xu.</Label><Label translateContent={false}>{t(profile.finance_mode==='family'?'Sổ Gia đình':'Sổ Cá nhân')}</Label><View style={styles.row}><Label>Thu nhập</Label><Label>{currencyTotals(summary,'income','today',profile.currency)}</Label></View><View style={styles.row}><Label>Chi tiêu</Label><Label>{currencyTotals(summary,'expense','today',profile.currency)}</Label></View><Button disabled={busy} secondary title={recorded?'Xem giao dịch':'Thêm thu chi'} onPress={recorded?onHistory:onAdd}/></Card>
      <Card><Label large>Mốc thưởng điểm danh</Label><Label translateContent={false}>7 {t('ngày')}: 100 {t('xu')} · 30 {t('ngày')}: 500 {t('xu')}</Label><Label muted>Thưởng mốc thay cho 20 xu của ngày đó. Nghỉ một ngày sẽ bắt đầu lại chuỗi.</Label></Card>
    </>:null}
  </Sheet>;
}





