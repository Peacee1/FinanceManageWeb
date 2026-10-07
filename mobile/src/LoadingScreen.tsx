import React from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Brand} from './brand';
import {Button,Label,Spinner,useTheme} from './ui';
import {Text} from './i18n';
export default function LoadingScreen({error,onRetry,onLogout}:{error?:string;onRetry?:()=>void;onLogout?:()=>void}){
 const c=useTheme();
 return <LinearGradient colors={[c.bg,c.card,c.bg]} style={{flex:1}}><SafeAreaView style={{flex:1,padding:28,justifyContent:'center',alignItems:'center',gap:28}}>
  <Brand large/><Label muted>Tài chính an tâm, tương lai vững bền</Label>
  <View style={{width:'100%',maxWidth:300,gap:18,alignItems:'center',marginTop:35}}>{error?<><Text accessibilityRole="alert" style={{color:c.expense,textAlign:'center'}}>{error}</Text>{onRetry&&<Button title="Thử lại" onPress={onRetry}/>} {onLogout&&<Button title="Đăng xuất" secondary onPress={onLogout}/>}</>:<><Spinner/><Text style={{color:c.primary,fontSize:11,fontWeight:'700',letterSpacing:2}}>ĐANG TẢI DỮ LIỆU…</Text><Label muted>Đang chuẩn bị không gian tài chính cho bạn…</Label></>}</View>
  <Text style={{position:'absolute',bottom:35,color:c.muted,fontSize:10,letterSpacing:1}}>POWERED BY PEACEE TEAM</Text>
 </SafeAreaView></LinearGradient>;
}
