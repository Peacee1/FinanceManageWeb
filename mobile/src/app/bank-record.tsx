import React,{useState} from 'react';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {ScrollView,Platform} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMobile} from '../../App';
import {bankExpenseDraft} from '../bankNotification';
import {Button,Card,Choices,Field,Label,useTheme} from '../ui';
import {useCategoryLabel} from '../i18n';
import {amountError,today} from '../format';
import AuthScreen from '../AuthScreen';
import {CentralLogin,sharedWeb} from '../sharedWebAuth';
export default function BankRecord(){
 const {text}=useLocalSearchParams<{text?:string}>(),router=useRouter(),{api,session,login,finance}=useMobile(),c=useTheme(),label=useCategoryLabel();
 const [source,setSource]=useState(typeof text==='string'?text.slice(0,12000):''),[amount,setAmount]=useState(()=>bankExpenseDraft(typeof text==='string'?text:'').amount),[category,setCategory]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[requestId]=useState(()=>Crypto.randomUUID());
 if(!session)return sharedWeb?<CentralLogin/>:<AuthScreen api={api} onLogin={login} register={false} onSwitch={()=>router.push('/register')}/>;
 const categories=(finance.data?.profile.custom_categories||[]).filter(item=>item.type==='EXPENSE');
 const read=(value:string)=>{const draft=bankExpenseDraft(value);setSource(draft.text);setAmount(draft.amount);setError('');};
 const save=async()=>{if(busy)return;const invalid=amountError(amount);if(invalid||!categories.some(item=>item.name===category)){setError(invalid||'Chọn danh mục.');return;}setBusy(true);setError('');try{await api('/transactions','POST',{type:'EXPENSE',amount:Number(amount),currency:'VND',category,date:today(),description:note,paymentMethod:'TRANSFER',requestId});await finance.refresh();router.replace('/calendar');}catch(failure){setError(failure instanceof Error?failure.message:'Không lưu được giao dịch.');setBusy(false);}};
 return <SafeAreaView style={{flex:1,backgroundColor:c.bg}}><ScrollView contentContainerStyle={{padding:20,gap:16,maxWidth:600,width:'100%',alignSelf:'center'}}><Label large>Ghi nhanh từ ngân hàng</Label><Label muted>Kiểm tra số tiền và chọn danh mục trước khi lưu. Nếu có nhiều số tiền hoặc không nhận diện được, hãy nhập số tiền thủ công.</Label><Card><Field label="Nội dung thông báo ngân hàng" value={source} onChange={read}/><Button secondary title="Dán từ bộ nhớ tạm" onPress={()=>{void Clipboard.getStringAsync().then(read).catch(()=>setError('Không đọc được bộ nhớ tạm.'));}}/></Card><Field label="Số tiền (VND)" numeric value={amount} onChange={setAmount}/><Label>Danh mục</Label><Choices value={category} onChange={setCategory} items={categories.map(item=>({value:item.name,label:label(item.name)}))}/><Field label="Ghi chú" value={note} onChange={setNote}/>{!!error&&<Label>{error}</Label>}<Button title={busy?'Đang lưu…':'Lưu khoản chi'} disabled={busy} onPress={()=>{void save();}}/><Button secondary title="Quay lại" disabled={busy} onPress={()=>router.replace('/home')}/>{Platform.OS==='web'&&<Label muted>Tính năng 2 chạm chạy qua Phím tắt trên iPhone đã cài Peacee1.</Label>}</ScrollView></SafeAreaView>;
}
