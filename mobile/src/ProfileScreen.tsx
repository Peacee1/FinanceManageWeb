import AvatarPicker from './AvatarPicker';
import {Text,LanguageContext,languages} from './i18n';
import React,{useContext} from 'react';
import {useDesktop} from './responsive';
import {Pressable,View,Linking} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {Card,Label,useTheme} from './ui';
import {mintStyles} from './brand';
import type {Profile} from './types';
type Icon=React.ComponentProps<typeof Feather>['name'];
export default function ProfileScreen({profile,onLogout,onNotices,onInfo,onCheckin,onTheme,onGoals,onFamily,onLanguage,onCategories}:{profile:Profile|null;onLogout:()=>void;onNotices:()=>void;onInfo:()=>void;onCheckin:()=>void;onTheme:()=>void;onGoals:()=>void;onFamily:()=>void;onLanguage:()=>void;onCategories:()=>void}){
 const desktop=useDesktop();const language=useContext(LanguageContext);const c=useTheme();const row=(name:string,icon:Icon,color:string,onPress:()=>void,detail?:string)=><Pressable key={name} accessibilityRole="button" onPress={onPress} style={mintStyles.settingRow}><View style={[mintStyles.iconCircle,{width:34,height:34,backgroundColor:color+'12'}]}><Feather name={icon} size={17} color={color}/></View><Text style={{color:c.text,fontSize:14,flex:1}}>{name}</Text>{!!detail&&<Text style={{color:c.muted,fontSize:11}}>{detail}</Text>}<Feather name="chevron-right" size={16} color={c.muted}/></Pressable>;
 return <><Label large>Hồ sơ cá nhân</Label><Card><View style={{alignItems:'center',flexDirection:desktop?'row':'column',gap:desktop?24:9,paddingTop:8}}><AvatarPicker/><Label large translateContent={false}>{profile?.name||'Peacee1'}</Label><Text style={{color:c.muted,fontSize:12}}>{profile?.email}</Text></View><View style={{flexDirection:'row',gap:10,marginTop:12}}>{[{title:'CHẾ ĐỘ',value:profile?.finance_mode==='family'?'Gia đình':'Cá nhân'},{title:'ĐIỂM THƯỞNG',value:`${profile?.coin||0} xu`}].map(item=><View key={item.title} style={{backgroundColor:c.bg,padding:14,borderRadius:15,flex:1,gap:5}}><Text style={{color:c.primary,fontSize:9,fontWeight:'700',letterSpacing:1}}>{item.title}</Text><Text style={{color:c.text,fontSize:13,fontWeight:'600'}}>{item.value}</Text></View>)}</View></Card>
  <View style={{flexDirection:desktop?'row':'column',gap:24}}><View style={{flex:desktop?1:undefined,flexShrink:0,gap:16}}><Text style={[mintStyles.smallHeading,{color:c.muted,marginTop:8}]}>CÀI ĐẶT CÁ NHÂN</Text><View style={[mintStyles.group,{backgroundColor:c.card}]}>{row('Thông tin tài khoản','user','#5B8CFF',onInfo)}{row('Gia đình','users',c.primary,onFamily,profile?.finance_mode==='family'?'Đang tham gia':'Thiết lập')}{row('Thông báo','bell','#F2A65D',onNotices)}{row('Danh mục thu chi','tag',c.primary,onCategories)}{row('Mục tiêu tiết kiệm','target','#AB75EE',onGoals)}{row('Điểm danh hằng ngày','gift',c.primary,onCheckin)}</View>
  </View><View style={{flex:desktop?1:undefined,flexShrink:0,gap:16}}><Text style={[mintStyles.smallHeading,{color:c.muted,marginTop:8}]}>ỨNG DỤNG</Text><View style={[mintStyles.group,{backgroundColor:c.card}]}>{row('Giao diện','sun',c.primary,onTheme)}{row('Ngôn ngữ','globe',c.primary,onLanguage,languages.find(item=>item.value===language)?.label)}{row('Đơn vị tiền tệ','dollar-sign',c.primary,onLanguage,profile?.currency||'VND')}{row('Privacy Policy','shield',c.primary,()=>{void Linking.openURL('https://peacee1.io.vn/privacy.html');})}{row('Đăng xuất','log-out','#EF6776',onLogout)}</View></View></View><Label muted>Peacee1 · Đồng hành cùng thói quen tài chính của bạn</Label>
 </>;
}










