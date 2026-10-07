import {Text} from './i18n';
import {useCaptcha} from './useCaptcha';
import React,{useRef,useState} from 'react';
import {View,ScrollView,Pressable,KeyboardAvoidingView,Platform,TextInput} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {LinearGradient} from 'expo-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,mintStyles} from './brand';
import {Button,Field,Label,useTheme} from './ui';


import {useDesktop} from './responsive';
import type {Api} from './api';
import type {Session} from './types';
export default function AuthScreen({api,onLogin,register,onSwitch}:{api:Api;onLogin:(session:Session)=>Promise<void>;register:boolean;onSwitch:()=>void}){

 const {verify,captchaView}=useCaptcha();
 const desktop=useDesktop();const c=useTheme(),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');const pending=useRef(false);
 const switchMode=()=>{if(pending.current)return;onSwitch();setError('');setNotice('');setPassword('');setConfirm('');};
 const submit=async()=>{
  if(pending.current)return;setError('');setNotice('');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||!password){setError('Nhập email và mật khẩu để tiếp tục.');return;}
  if(register&&(!name.trim()||password!==confirm)){setError(!name.trim()?'Nhập họ và tên.':'Mật khẩu xác nhận chưa khớp.');return;}
  if(register&&(!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)||password.length<8)){setError('Mật khẩu cần từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');return;}
  pending.current=true;setBusy(true);
  try{
   const captchaToken=await verify(register?'register':'login');
   if(register){await api('/auth/register','POST',{name:name.trim(),email:email.trim(),password,captchaToken});onSwitch();setPassword('');setConfirm('');setNotice('Tạo tài khoản thành công. Đăng nhập để bắt đầu.');}
   else{const {data}=await api<Session>('/auth/login','POST',{email:email.trim(),password,loginType:'owner',captchaToken,...(Platform.OS!=='web'?{clientType:'native'}:{})});if(data.user.role!=='owner'){setError('Bản app đầu tiên dành cho tài khoản cá nhân và gia đình.');return;}await onLogin(data);setPassword('');}
  }catch(failure){setError(failure instanceof Error?failure.message:'Không thể đăng nhập.');}finally{pending.current=false;setBusy(false);}
 };
 return <LinearGradient colors={[c.bg,c.bg,c.card]} style={{flex:1}}><SafeAreaView style={{flex:1}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:24,gap:28,maxWidth:desktop?1200:460,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:desktop?'row':'column',gap:desktop?80:28,alignItems:desktop?'center':undefined}}>
  {desktop&&<View style={{flex:1,backgroundColor:c.primary,borderRadius:28,padding:48,gap:28,minHeight:600,justifyContent:'center'}}><Feather name="credit-card" size={44} color="white"/><Text style={{color:'white',fontSize:46,fontWeight:'800',lineHeight:58}}>Peacee1</Text><Text style={{color:'white',fontSize:30,fontWeight:'700',lineHeight:42}}>Quản lý tiền mỗi ngày, cùng bạn xây dựng những mục tiêu lớn.</Text><Text style={{color:'#FFFFFFCC',fontSize:16,lineHeight:28}}>Cá nhân · Gia đình</Text><Text style={{color:'#FFFFFFCC',fontSize:16,lineHeight:28}}>Dữ liệu đồng bộ với Peacee1</Text></View>}
  <View style={{width:desktop?430:undefined,gap:28}}><Brand large/>
  <View style={[mintStyles.authCard,{backgroundColor:c.card}]}><View style={{alignItems:'center',gap:6,marginBottom:8}}><Label large>{register?'Tạo tài khoản':'Chào bạn quay lại'}</Label><Label muted>{register?'Bắt đầu hành trình tiết kiệm':'Đăng nhập để quản lý chi tiêu'}</Label></View>
   {register&&<Field label="Họ và tên" value={name} onChange={setName} placeholder="Họ và tên của bạn"/>}
   <Field label="Email" value={email} onChange={setEmail} placeholder="Email" autoCapitalize="none"/>
   <View style={{gap:7}}><Label muted>Mật khẩu</Label><View style={{flexDirection:'row',backgroundColor:c.bg,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:c.border,alignItems:'center'}}><TextInput accessibilityLabel="Mật khẩu" autoCapitalize="none" autoCorrect={false} secureTextEntry={!show} value={password} onChangeText={setPassword} placeholder="Mật khẩu" placeholderTextColor={c.muted} style={{flex:1,minWidth:0,padding:15,fontSize:16,color:c.text,backgroundColor:c.bg,borderTopLeftRadius:14,borderBottomLeftRadius:14,borderWidth:0}}/><Pressable accessibilityRole="button" accessibilityLabel={show?'Ẩn mật khẩu':'Hiện mật khẩu'} onPress={()=>setShow(!show)} style={{padding:14}}><Feather name={show?'eye-off':'eye'} size={18} color={c.muted}/></Pressable></View></View>
   {register&&<Field label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} secure={!show} autoCapitalize="none"/>}
   {!!error&&<Text accessibilityRole="alert" style={{color:c.expense,fontSize:13,lineHeight:20}}>{error}</Text>}{!!notice&&<Text style={{color:c.income,fontSize:13}}>{notice}</Text>}
   <Button title={busy?'Đang xử lý…':register?'Đăng ký ngay':'Tiếp tục'} onPress={submit} disabled={busy}/>
   <Text style={{color:c.muted,fontSize:11,textAlign:'center',lineHeight:18}}>Quản lý tiền mỗi ngày, cùng bạn xây dựng những mục tiêu lớn.</Text>
  </View>
  <View style={{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:5}}><Label muted>{register?'Đã có tài khoản?':'Bạn là người mới?'}</Label><Pressable accessibilityRole="button" disabled={busy} onPress={switchMode}><Text style={[mintStyles.link,{color:c.primary}]}>{register?'Đăng nhập':'Tạo tài khoản'}</Text></Pressable></View>
 </View></View></ScrollView></KeyboardAvoidingView></SafeAreaView>{captchaView}</LinearGradient>;
}





