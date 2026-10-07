import React,{useRef,useState} from 'react';
import {Image,Platform,Pressable,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import {Text,useTranslate} from './i18n';
import {useMobile} from '../App';
import {useTheme} from './ui';
export default function AvatarPicker(){
 const {api,finance}=useMobile(),profile=finance.data?.profile,c=useTheme(),t=useTranslate();const [busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef(false);
 const choose=async()=>{if(pending.current)return;pending.current=true;setError('');try{
  const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:Platform.OS!=='web',aspect:[1,1],quality:.8});if(picked.canceled)return;const asset=picked.assets[0];const mime=asset.mimeType||'image/jpeg';if(!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))throw Error('Chọn ảnh JPG, PNG, WebP hoặc GIF, tối đa 5 MB.');if((asset.fileSize||asset.file?.size||0)>5*1024*1024)throw Error('Chọn ảnh JPG, PNG, WebP hoặc GIF, tối đa 5 MB.');
  setBusy(true);const form=new FormData(),extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'} as Record<string,string>)[mime];if(Platform.OS==='web'){if(!asset.file)throw Error('Không đọc được ảnh đã chọn.');form.append('avatar',asset.file,`avatar.${extension}`);}else form.append('avatar',{uri:asset.uri,name:`avatar.${extension}`,type:mime} as unknown as Blob);await api('/users/update-avatar','POST',form);await finance.refresh();
 }catch(failure){setError(failure instanceof Error?failure.message:'Không cập nhật được ảnh đại diện.');}finally{pending.current=false;setBusy(false);}};
 const base=Platform.OS==='web'?'/api':process.env.EXPO_PUBLIC_API_URL||'https://finance.peacee1.io.vn/api',uri=profile?.avatar_url?`${base}${profile.avatar_url}`:null;
 return <View style={{alignItems:'center',gap:8}}><Pressable accessibilityRole="button" accessibilityLabel={t('Đổi ảnh đại diện')} disabled={busy} onPress={()=>void choose()} style={{width:86,height:86,borderRadius:43,backgroundColor:c.bg,justifyContent:'center',alignItems:'center'}}>{uri?<Image source={{uri}} style={{width:86,height:86,borderRadius:43}}/>:<Text translateContent={false} style={{fontSize:35,fontWeight:'800',color:c.primary}}>{profile?.name?.slice(0,1).toUpperCase()||'P'}</Text>}<View style={{position:'absolute',right:-2,bottom:0,width:28,height:28,borderRadius:14,backgroundColor:c.primary,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:c.card}}><Feather name="camera" size={14} color="white"/></View></Pressable><Text style={{fontSize:12,color:c.primary}}>{busy?'Đang tải ảnh…':'Đổi ảnh đại diện'}</Text>{!!error&&<Text accessibilityRole="alert" style={{color:c.expense,fontSize:12,maxWidth:280}}>{error}</Text>}</View>;
}
