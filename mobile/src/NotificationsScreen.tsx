import {Text} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Button,Card,Label,Sheet,Spinner,useTheme} from './ui';
import type {Api} from './api';
import type {Notice} from './types';
export default function NotificationsScreen({api,onClose,onNavigate,onUnread}:{api:Api;onClose:()=>void;onNavigate:(target:string)=>void;onUnread:(count:number)=>void}){
 const c=useTheme(),[items,setItems]=useState<Notice[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef(false);
 useEffect(()=>{let live=true;api<{items:Notice[];unread:number;nextCursor:string|null}>('/users/notifications').then(({data})=>{if(live){setItems(data.items);setCursor(data.nextCursor);onUnread(data.unread);}}).catch(failure=>{if(live)setError(failure.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[api,onUnread]);
 const perform=async(work:()=>Promise<void>)=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await work();}catch(failure){setError(failure instanceof Error?failure.message:'Không cập nhật được thông báo.');}finally{setBusy(false);pending.current=false;}};
 return <Sheet title="Thông báo" onClose={onClose}>{loading&&<Spinner/>}{!!error&&<Text style={{color:c.expense}}>{error}</Text>}<Button title="Đánh dấu tất cả đã đọc" disabled={busy||loading} secondary onPress={()=>perform(async()=>{await api('/users/notifications/read','POST',{all:true});setItems(current=>current.map(item=>({...item,read_at:new Date().toISOString()})));onUnread(0);})}/>{!loading&&!items.length&&<Label muted>Chưa có thông báo.</Label>}{items.map(item=><Pressable key={item.id} accessibilityRole="button" disabled={busy} onPress={()=>perform(async()=>{await api('/users/notifications/read','POST',{id:String(item.id)});setItems(current=>current.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row));onNavigate(item.target);})}><Card><View style={{flexDirection:'row',gap:8}}>{!item.read_at&&<View style={{width:7,height:7,borderRadius:4,backgroundColor:c.primary,marginTop:7}}/>}<Text style={{color:c.text,fontSize:15,fontWeight:'700',flex:1}}>{item.title}</Text></View><Label muted>{item.message}</Label><Text style={{color:c.muted,fontSize:10}}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text></Card></Pressable>)}{!!cursor&&<Button secondary title="Xem thêm" disabled={busy} onPress={()=>perform(async()=>{const {data}=await api<{items:Notice[];unread:number;nextCursor:string|null}>(`/users/notifications?before=${cursor}`);setItems(current=>[...current,...data.items]);setCursor(data.nextCursor);onUnread(data.unread);})}/>}</Sheet>;
}



