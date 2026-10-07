import {transferMemo} from './transferMemo';
import * as Crypto from 'expo-crypto';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Linking,Platform,Pressable} from 'react-native';
import {CameraView,Camera,useCameraPermissions} from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import {useMobile} from '../../App';
import {Button,Card,Field,Label,Sheet,Choices,useTheme} from '../ui';
import {Text,useTranslate,useCategoryLabel} from '../i18n';
import {today,amountError} from '../format';
import {parseVietQr,paymentLink,type Recipient} from './vietQr';

type BankApp={appId:string;appName:string;autofill?:number};
type Bank={bin:string;code:string;shortName:string};

export default function QrPayment({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}){
 const {api,session,finance}=useMobile(),c=useTheme(),t=useTranslate(),categoryLabel=useCategoryLabel();
 const [permission,requestPermission]=useCameraPermissions();
 const [camera,setCamera]=useState(false),[apps,setApps]=useState<BankApp[]>([]),[banks,setBanks]=useState<Bank[]>([]),[appId,setAppId]=useState(''),[choosing,setChoosing]=useState(true),[search,setSearch]=useState('');
 const [recipient,setRecipient]=useState<Recipient|null>(null),[amount,setAmount]=useState(''),[memo,setMemo]=useState(''),[opened,setOpened]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const categories=(finance.data?.profile.custom_categories||[]).filter(item=>item.type==='EXPENSE');
 const [category,setCategory]=useState(categories[0]?.name||'');
 const pending=useRef(false),lastScan=useRef(''),requestId=useRef<string|null>(null);
 const preferenceKey=`peacee1.bank.${session?.user.id}`;
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  void Promise.all([fetch(`https://api.vietqr.io/v2/${Platform.OS==='ios'?'ios':'android'}-app-deeplinks`,{signal:controller.signal}),fetch('https://api.vietqr.io/v2/banks',{signal:controller.signal})]).then(async responses=>{
   if(responses.some(response=>!response.ok))throw Error('Không tải được danh sách ngân hàng.');
   const [appData,bankData]=await Promise.all(responses.map(response=>response.json()));
   if(!Array.isArray(appData.apps)||!Array.isArray(bankData.data))throw Error('Danh sách ngân hàng không hợp lệ.');
   const stored=await SecureStore.getItemAsync(preferenceKey);
   if(active){setApps(appData.apps);setBanks(bankData.data);if(stored&&appData.apps.some((app:BankApp)=>app.appId===stored)){setAppId(stored);setChoosing(false);}}
  }).catch(()=>{if(active)setError('Không tải được danh sách ngân hàng. Kiểm tra kết nối rồi thử lại.');}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[preferenceKey,reload]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state!=='active')setCamera(false);});return()=>listener.remove();},[]);
 const accept=(payload:string)=>{if(lastScan.current===payload)return;lastScan.current=payload;try{const parsed=parseVietQr(payload);requestId.current=Crypto.randomUUID();setRecipient(parsed);setAmount(parsed.amount);setMemo(transferMemo(finance.data?.profile.name||session?.user.name||''));setOpened(false);setSaved(false);setCamera(false);setError('');}catch(failure){setError(failure instanceof Error?failure.message:'Không đọc được QR.');}};
 const image=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setCamera(false);setError('');try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:1});if(result.canceled)return;const codes=await Camera.scanFromURLAsync(result.assets[0].uri,['qr']);if(!codes.length)throw Error('Không tìm thấy QR trong ảnh.');lastScan.current='';accept(codes[0].data);}catch(failure){setError(failure instanceof Error?failure.message:'Không đọc được ảnh.');}finally{pending.current=false;setBusy(false);}};
 const chooseBank=async(id:string)=>{if(pending.current||opened||!session)return;pending.current=true;setBusy(true);setError('');try{await SecureStore.setItemAsync(preferenceKey,id);setAppId(id);setChoosing(false);}catch{setError('Không lưu được ngân hàng. Vui lòng thử lại.');}finally{pending.current=false;setBusy(false);}};
 const selectedApp=apps.find(app=>app.appId===appId),recipientBank=banks.find(bank=>bank.bin===recipient?.bankBin);
 const valid=!!recipient&&!!selectedApp&&!!recipientBank&&!amountError(amount);
 const openBank=async()=>{if(!valid||!recipient||!recipientBank||pending.current)return;pending.current=true;setBusy(true);setError('');try{await Linking.openURL(paymentLink(appId,{...recipient,bankCode:recipientBank.code.toLowerCase()},amount,memo));setOpened(true);}catch{setError('Không mở được ngân hàng. Hãy kiểm tra app đã cài hoặc sao chép thông tin để chuyển thủ công.');}finally{pending.current=false;setBusy(false);}};
 const save=async()=>{if(pending.current||saved||!opened||!valid||!categories.some(item=>item.name===category))return;pending.current=true;setBusy(true);setError('');try{await api('/transactions','POST',{requestId:requestId.current,type:'EXPENSE',currency:'VND',amount:Number(amount),category,date:today(),paymentMethod:'TRANSFER',description:`${memo||'Chuyển khoản QR'} · ${selectedApp?.appName} · người dùng xác nhận đã thanh toán`});setSaved(true);await onSaved();}catch(failure){setError(failure instanceof Error?failure.message:'Không lưu được khoản chi.');}finally{pending.current=false;setBusy(false);}};
 return <Sheet title="Quét QR thanh toán" canClose={!busy} onClose={onClose}>
  <Card><Label>Ngân hàng của tôi</Label>{selectedApp&&<Label translateContent={false}>{selectedApp.appName}</Label>}<Button secondary title={choosing?'Ẩn danh sách':'Chọn ngân hàng'} onPress={()=>setChoosing(!choosing)} disabled={busy||opened}/>{choosing&&<><Field label="Tìm ngân hàng" value={search} onChange={setSearch}/>{apps.filter(app=>app.appName.toLowerCase().includes(search.toLowerCase())).map(app=><Pressable key={app.appId} accessibilityRole="button" accessibilityState={{selected:app.appId===appId}} disabled={busy||opened} onPress={()=>void chooseBank(app.appId)} style={{padding:14,borderRadius:12,borderWidth:1,borderColor:app.appId===appId?c.primary:c.border}}><Text translateContent={false} style={{color:c.text}}>{app.appName}</Text></Pressable>)}</>}{!apps.length&&<Button secondary title="Tải lại danh sách" onPress={()=>{setError('');setReload(value=>value+1);}}/>}</Card>
  {!recipient&&<><Button title={camera?'Dừng camera':'Mở camera'} disabled={busy} onPress={()=>{void (async()=>{try{if(camera){setCamera(false);return;}const granted=permission?.granted|| (await requestPermission()).granted;if(!granted){setError('Cho phép truy cập camera trong Cài đặt hoặc chọn ảnh QR.');return;}lastScan.current='';setError('');setCamera(true);}catch{setError('Không mở được camera. Hãy thử chọn ảnh QR.');}})();}}/>{camera&&permission?.granted&&<CameraView style={{height:300,borderRadius:20,overflow:'hidden'}} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={result=>accept(result.data)} onMountError={()=>{setCamera(false);setError('Không mở được camera trên thiết bị này.');}}/>}<Button secondary title="Chọn ảnh QR" disabled={busy} onPress={()=>void image()}/><Label muted>Hỗ trợ VietQR chuyển khoản vào tài khoản, bằng VND.</Label></>}
  {recipient&&<><Card><Label>Người nhận</Label><Label translateContent={false}>{recipientBank?.shortName||recipient.bankBin}</Label><Label translateContent={false}>{recipient.account}</Label>{!!recipient.name&&<Label translateContent={false}>{recipient.name}</Label>}<Label muted>Kiểm tra tên người nhận trong app ngân hàng trước khi xác nhận.</Label></Card>{opened?<Card><Label translateContent={false}>{Number(amount).toLocaleString('vi-VN')} ₫ · {memo}</Label></Card>:<><Field label="Số tiền (VND)" value={amount} onChange={value=>setAmount(value.replace(/[^0-9]/g,''))} numeric/><Field label="Nội dung chuyển khoản" value={memo} onChange={value=>setMemo(value.slice(0,140))}/></>}
   <Label muted>{selectedApp?.autofill?'Ngân hàng hỗ trợ điền sẵn. Kiểm tra lại thông tin trong app.':'Nếu ngân hàng không điền sẵn, sao chép thông tin để nhập thủ công.'}</Label>
   <Button secondary title="Sao chép thông tin" onPress={()=>{void Clipboard.setStringAsync(`${recipientBank?.shortName||recipient.bankBin}\n${recipient.account}\n${amount} VND\n${memo}`).catch(()=>setError('Không sao chép được thông tin.'));}}/>
   <Button title={`${t('Mở')} ${selectedApp?.appName||t('ngân hàng')}`} disabled={!valid||busy||saved} onPress={()=>void openBank()}/>
   {opened&&!saved&&<><Label muted>Mở ngân hàng chưa có nghĩa đã thanh toán. Chỉ lưu sau khi bạn đã chuyển tiền.</Label><Choices items={categories.map(item=>({value:item.name,label:categoryLabel(item.name)}))} value={category} onChange={setCategory}/><Button title="Tôi đã thanh toán · Lưu khoản chi" disabled={busy||!category} onPress={()=>void save()}/></>}
   {saved&&<Label>Đã lưu khoản chi.</Label>}<Button secondary title="Quét mã khác" disabled={busy} onPress={()=>{setRecipient(null);setOpened(false);setSaved(false);lastScan.current='';setError('');}}/>
  </>}{!!error&&<Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text>}
 </Sheet>;
}
