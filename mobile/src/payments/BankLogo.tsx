import React,{useState} from 'react';
import {Image,View} from 'react-native';
import {Text} from '../i18n';
import {useTheme} from '../ui';
export default function BankLogo({uri,name}:{uri?:string;name:string}){
 const c=useTheme(),[failed,setFailed]=useState<string|null>(null);
 const available=!!uri&&uri.startsWith('https://')&&failed!==uri;
 return <View style={{width:40,height:40,borderRadius:10,overflow:'hidden',backgroundColor:available?'#FFFFFF':c.bg,alignItems:'center',justifyContent:'center'}}>{available?<Image source={{uri}} accessibilityLabel={name} resizeMode="contain" style={{width:36,height:36}} onError={()=>setFailed(uri!)}/>:<Text translateContent={false} style={{color:c.primary,fontSize:13,fontWeight:'700'}}>{name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</Text>}</View>;
}
