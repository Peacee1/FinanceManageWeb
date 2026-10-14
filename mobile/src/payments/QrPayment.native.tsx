import BankLogo from './BankLogo';
import {transferMemo} from './transferMemo';
import * as Crypto from 'expo-crypto';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,Linking,Platform,Pressable,View,Modal,ScrollView,TextInput,StyleSheet} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView,Camera,useCameraPermissions} from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import {useMobile} from '../../App';
import {Button,Field,Label,useTheme} from '../ui';
import {Text,useTranslate} from '../i18n';
import {today,amountError} from '../format';
import {formatNumberInput} from '../numberInput';
import {parseVietQr,paymentLink,type Recipient} from './vietQr';

type BankApp={appId:string;appName:string;appLogo?:string;autofill?:number};
type Bank={bin:string;code:string;shortName:string};

export default function QrPayment({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}){
 const {api,session,finance}=useMobile(),c=useTheme(),t=useTranslate();
 const [permission,requestPermission]=useCameraPermissions();
 const [camera,setCamera]=useState(true),[apps,setApps]=useState<BankApp[]>([]),[banks,setBanks]=useState<Bank[]>([]),[appId,setAppId]=useState(''),[choosing,setChoosing]=useState(true),[search,setSearch]=useState('');
 const [recipient,setRecipient]=useState<Recipient|null>(null),[amount,setAmount]=useState(''),[memo,setMemo]=useState(''),[saved,setSaved]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const categories=(finance.data?.profile.custom_categories||[]).filter(item=>item.type==='EXPENSE');
 const category=categories.find(item=>['khác','other'].includes(item.name.trim().toLowerCase()))?.name||'Khác';
 const accepted=useRef(false);
 const savedRef=useRef(false),submission=useRef<Record<string,unknown>|null>(null);
 useEffect(()=>{if(permission&&!permission.granted&&permission.canAskAgain)void requestPermission();},[permission,requestPermission]);
 const pending=useRef(false),lastScan=useRef(''),requestId=useRef<string|null>(null);
 const preferenceKey=`peacee1.bank.${session?.user.id}`;
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  void Promise.all([fetch(`https://api.vietqr.io/v2/${Platform.OS==='ios'?'ios':'android'}-app-deeplinks`,{signal:controller.signal}),fetch('https://api.vietqr.io/v2/banks',{signal:controller.signal})]).then(async responses=>{
   if(responses.some(response=>!response.ok))throw Error('Không tải được danh sách ngân hàng.');
   const [appData,bankData]=await Promise.all(responses.map(response=>response.json()));
   if(!Array.isArray(appData.apps)||!Array.isArray(bankData.data))throw Error('Danh sách ngân hàng không hợp lệ.');
   const stored=await SecureStore.getItemAsync(preferenceKey);
   if(active){setApps(appData.apps);setBanks(bankData.data);if(stored&&appData.apps.some((app:BankApp)=>app.appId===stored)){setAppId(stored);}}
  }).catch(()=>{if(active)setError('Không tải được danh sách ngân hàng. Kiểm tra kết nối rồi thử lại.');}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[preferenceKey,reload]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{setCamera(state==='active');});return()=>listener.remove();},[]);
 const accept=(payload:string)=>{if(accepted.current||lastScan.current===payload)return;lastScan.current=payload;try{const parsed=parseVietQr(payload);accepted.current=true;requestId.current=Crypto.randomUUID();setRecipient(parsed);setAmount(parsed.amount);setMemo(transferMemo(finance.data?.profile.name||session?.user.name||''));setSaved(false);savedRef.current=false;submission.current=null;setChoosing(true);setCamera(false);setError('');}catch(failure){setError(failure instanceof Error?failure.message:'Không đọc được QR.');}};
 const image=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setCamera(false);setError('');try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:1});if(result.canceled){setCamera(true);return;}const codes=await Camera.scanFromURLAsync(result.assets[0].uri,['qr']);if(!codes.length)throw Error('Không tìm thấy QR trong ảnh.');lastScan.current='';accept(codes[0].data);}catch(failure){setCamera(true);setError(failure instanceof Error?failure.message:'Không đọc được ảnh.');}finally{pending.current=false;setBusy(false);}};
 const chooseBank=async(id:string)=>{if(pending.current||savedRef.current||!session)return;pending.current=true;setBusy(true);setError('');try{await SecureStore.setItemAsync(preferenceKey,id);setAppId(id);setChoosing(false);}catch{setError('Không lưu được ngân hàng. Vui lòng thử lại.');}finally{pending.current=false;setBusy(false);}};
 const selectedApp=apps.find(app=>app.appId===appId),recipientBank=banks.find(bank=>bank.bin===recipient?.bankBin);
 const valid=!!recipient&&!!selectedApp&&!!recipientBank&&!amountError(amount);
 const openBank=async()=>{if(!valid||!recipient||!recipientBank||!selectedApp||pending.current)return;pending.current=true;setBusy(true);setError('');try{
  const link=paymentLink(appId,{...recipient,bankCode:recipientBank.code.toLowerCase()},amount,memo);
  if(!submission.current)submission.current={requestId:requestId.current,type:'EXPENSE',currency:'VND',amount:Number(amount),category,date:today(),paymentMethod:'TRANSFER',description: t('Chuyển khoản nhanh qua')+' '+selectedApp.appName.trim()+' '+t('lúc')+' '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false})+(memo?' · '+memo:'')};
  if(!savedRef.current){await api('/transactions','POST',submission.current);savedRef.current=true;setSaved(true);}
  const response=await fetch(link,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':Platform.OS==='ios'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'}});if(!response.ok)throw Error(t('Không lấy được liên kết ngân hàng.'));const html=await response.text();const direct=html.match(/const DEEPLINK = ['"]([^'"]+)['"]/i)?.[1];
  if(!direct||!/^([a-z][a-z0-9+.-]*):\/\//i.test(direct)||/^(https?|javascript|data|file|intent):/i.test(direct))throw Error(t('Ngân hàng chưa cung cấp liên kết mở app trực tiếp.'));
  await Linking.openURL(direct);
 }catch(failure){setError((savedRef.current?t('Đã lưu khoản chi.')+' ':'')+(failure instanceof Error?failure.message:t('Không mở được ngân hàng.')));}finally{pending.current=false;setBusy(false);if(savedRef.current)void onSaved().catch(()=>{});}};
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><View style={{flex:1,backgroundColor:recipient?c.bg:'#151515'}}>
 {!recipient?<>
 {camera&&permission?.granted&&<CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={result=>accept(result.data)} onMountError={()=>{setCamera(false);setError('Không mở được camera trên thiết bị này.');}}/>}
 <SafeAreaView style={{flex:1}}><View style={{flexDirection:'row',alignItems:'center',padding:20,gap:16}}><Pressable onPress={onClose} accessibilityLabel={t('Đóng')} style={{padding:12,backgroundColor:'#0007',borderRadius:30}}><Feather name="arrow-left" size={26} color="white"/></Pressable><Text style={{color:'white',fontSize:28,fontWeight:'700'}}>Quét mã</Text></View>
 <View pointerEvents="none" style={{flex:1,justifyContent:'center',alignItems:'center',gap:28}}><Text style={{color:'white',backgroundColor:c.primary,padding:15,borderRadius:18}}>Quét QR thanh toán</Text><View style={{width:'75%',aspectRatio:1}}>{[{top:0,left:0,borderTopWidth:5,borderLeftWidth:5},{top:0,right:0,borderTopWidth:5,borderRightWidth:5},{bottom:0,left:0,borderBottomWidth:5,borderLeftWidth:5},{bottom:0,right:0,borderBottomWidth:5,borderRightWidth:5}].map((corner,index)=><View key={index} style={{position:'absolute',width:35,height:35,borderColor:'white',borderRadius:4,...corner}}/>)}</View></View>
 <View style={{padding:24,gap:14}}>{!permission?.granted&&<Button title="Mở camera" onPress={()=>void requestPermission().then(result=>{setCamera(result.granted);if(!result.granted)setError('Cho phép truy cập camera trong Cài đặt hoặc chọn ảnh QR.');})}/>}<Button secondary title="Chọn ảnh QR" disabled={busy} onPress={()=>void image()}/>{!!error&&<Text accessibilityRole="alert" style={{color:'#ffb5b5'}}>{error}</Text>}</View></SafeAreaView>
 </>:<SafeAreaView style={{flex:1}}><View style={{padding:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Pressable disabled={busy} onPress={onClose} accessibilityLabel={t('Đóng')}><Feather name="x" size={30} color={c.text}/></Pressable><Label>{choosing?'Chọn ngân hàng':'Chuyển khoản'}</Label></View>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:22,gap:22,flexGrow:1}}>
 {choosing?<><Field label="Tìm ngân hàng" value={search} onChange={setSearch}/>{apps.filter(app=>app.appName.toLowerCase().includes(search.toLowerCase())).map(app=><Pressable key={app.appId} disabled={busy} onPress={()=>void chooseBank(app.appId)} style={{padding:16,borderRadius:16,borderWidth:1,borderColor:app.appId===appId?c.primary:c.border,flexDirection:'row',alignItems:'center',gap:12}}><BankLogo uri={app.appLogo} name={app.appName}/><Text translateContent={false} style={{flex:1,color:c.text}}>{app.appName}</Text>{app.appId===appId&&<Feather name="check" size={20} color={c.primary}/>}</Pressable>)}{!apps.length&&<Button secondary title="Tải lại danh sách" onPress={()=>setReload(value=>value+1)}/>}</>:<>
 <View style={{gap:12}}><Label muted>Tài khoản người nhận</Label><Label large translateContent={false}>{recipient.account}</Label><Label muted translateContent={false}>{recipientBank?.shortName||recipient.bankBin}{recipient.name?' · '+recipient.name:''}</Label></View>
 <View style={{gap:10,marginTop:20}}><Label muted>Số tiền (VND)</Label><View style={{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.primary}}><TextInput accessibilityLabel={t('Số tiền (VND)')} autoFocus={!saved} editable={!saved} keyboardType="number-pad" value={formatNumberInput(amount)} onChangeText={value=>{if(!submission.current)setAmount(value.replace(/[^0-9]/g,''));}} placeholder="0" placeholderTextColor={c.muted} style={{flex:1,color:c.text,fontSize:40,paddingVertical:16}}/><Label>VND</Label></View></View>
 <Field label="Nội dung chuyển khoản" value={memo} onChange={value=>{if(!submission.current)setMemo(value.slice(0,140));}}/>
 <View style={{flex:1}}/><View style={{flexDirection:'row',gap:8}}>{['10000','375000','600000'].map(value=><Pressable disabled={saved||busy} key={value} onPress={()=>{if(!submission.current)setAmount(value);}} style={{padding:10,borderRadius:20,backgroundColor:c.card}}><Label translateContent={false}>{formatNumberInput(value)}</Label></Pressable>)}</View>
 <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Pressable disabled={saved||busy} onPress={()=>setChoosing(true)} style={{flex:1,gap:8}}><Label muted>Bằng ứng dụng</Label><View style={{flexDirection:'row',alignItems:'center',gap:8}}><BankLogo uri={selectedApp?.appLogo} name={selectedApp?.appName||''}/><Text translateContent={false} style={{color:c.text,fontWeight:'700'}}>{selectedApp?.appName}</Text><Feather name="chevron-down" size={18} color={c.text}/></View></Pressable><View style={{flex:1}}><Button title={saved?'Mở ngân hàng':'Chuyển khoản'} disabled={!valid||busy} onPress={()=>void openBank()}/></View></View>
 {saved&&<Label>Đã lưu khoản chi.</Label>}<Button secondary title="Sao chép thông tin" onPress={()=>void Clipboard.setStringAsync(recipient.account+'\n'+amount+' VND\n'+memo)}/><Button secondary title="Quét mã khác" disabled={busy} onPress={()=>{accepted.current=false;setRecipient(null);setSaved(false);savedRef.current=false;submission.current=null;lastScan.current='';setError('');setCamera(true);}}/>
 </>}{!!error&&<Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text>}</ScrollView></SafeAreaView>}
 </View></Modal>;
}
