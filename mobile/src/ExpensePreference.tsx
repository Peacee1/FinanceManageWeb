import React,{useRef,useState} from 'react';
import {Platform,Switch,View} from 'react-native';
import {useMobile} from '../App';
import {Card,Label,useTheme} from './ui';
import {Text,useTranslate} from './i18n';

export default function ExpensePreference(){
 const t=useTranslate();const {api,finance}=useMobile(),c=useTheme();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef(false);
 const expenseOnly=finance.data?.profile.expense_only!==false;
 const change=async(value:boolean)=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await api('/users/settings','POST',{expenseOnly:value});await finance.refresh();}catch{setError('Không lưu được tùy chọn. Vui lòng thử lại.');}finally{pending.current=false;setBusy(false);}};
 return <Card><Label large>Quản lý thu chi</Label><View style={{flexDirection:'row',alignItems:'center',gap:16}}><View style={{flex:1,gap:6}}><Label>Chỉ quản lý khoản chi</Label><Label muted>{expenseOnly?'Đang bật · Chỉ hiển thị khoản chi trong trang chủ, lịch và báo cáo.':'Đang tắt · Có thể thêm cả khoản thu và khoản chi.'}</Label></View><Switch accessibilityLabel={t('Chỉ quản lý khoản chi')} {...(Platform.OS==='web'?{activeThumbColor:'#FFFFFF'}:{})} disabled={busy||!finance.data} value={expenseOnly} onValueChange={value=>void change(value)} trackColor={{false:c.border,true:c.primary}} thumbColor="#FFFFFF"/></View><Label muted>Khoản thu đã ghi vẫn được lưu. Tắt tùy chọn này để xem và quản lý lại khoản thu.</Label>{!!error&&<Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text>}</Card>;
}
