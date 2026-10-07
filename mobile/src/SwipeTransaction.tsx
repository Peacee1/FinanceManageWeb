import React,{useEffect,useRef,useState} from 'react';
import {Animated,PanResponder,Platform,Pressable,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {useMobile} from '../App';
import {Text,useTranslate} from './i18n';
import {Button,Card,Label,Sheet,useTheme} from './ui';
import {dateLabel,money} from './format';
import TransactionForm from './TransactionForm';
import {useDesktop} from './responsive';
import {beginTransactionGesture,clearTransactionGesture,keepTransactionInteraction,setExpandedTransaction,clearExpandedTransaction,transactionSwipeTarget} from './transactionGesture';
import type {Transaction} from './types';
const reveal=160;
export default function SwipeTransaction({item,children}:{item:Transaction;children:React.ReactNode}){
 const {api,finance}=useMobile(),c=useTheme(),t=useTranslate(),desktop=useDesktop();
 const [translation]=useState(()=>new Animated.Value(0)),settled=useRef(0),start=useRef(0),pending=useRef(false),saved=useRef(false),dragged=useRef(false),actionTouched=useRef(false);
 const [side,setSide]=useState<'left'|'right'>('right'),[open,setOpen]=useState(false),[edit,setEdit]=useState(false),[remove,setRemove]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const unlock=()=>{clearTransactionGesture(item.id);};
 useEffect(()=>()=>{clearTransactionGesture(item.id);clearExpandedTransaction(item.id);},[item.id]);
 const animate=(value:number)=>{settled.current=value;if(value)setExpandedTransaction(item.id,()=>animate(0));else clearExpandedTransaction(item.id);setOpen(value!==0);if(value)setSide(value>0?'left':'right');Animated.timing(translation,{toValue:value,duration:180,useNativeDriver:Platform.OS!=='web'}).start();};
 // PanResponder stores callbacks; their refs are accessed during gestures.
 // eslint-disable-next-line react-hooks/refs
 const pan=PanResponder.create({
  onStartShouldSetPanResponderCapture:()=>{beginTransactionGesture(item.id);if(settled.current)keepTransactionInteraction();dragged.current=false;actionTouched.current=false;return false;},
  onMoveShouldSetPanResponder:(_,g)=>{if(!dragged.current&&settled.current&&(Math.abs(g.dy)>12&&Math.abs(g.dy)>=Math.abs(g.dx)||g.numberActiveTouches>1))animate(0);return !desktop&&!edit&&!remove&&g.numberActiveTouches===1&&Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.6;},
  onPanResponderGrant:()=>{dragged.current=true;start.current=settled.current;translation.stopAnimation(value=>{start.current=value;});},
  onPanResponderMove:(_,g)=>{const value=Math.max(-reveal,Math.min(reveal,start.current+g.dx));setSide(value>=0?'left':'right');translation.setValue(value);},
  onPanResponderRelease:(_,g)=>{animate(transactionSwipeTarget(start.current,g.dx));unlock();},
  onPanResponderTerminationRequest:()=>false,
  onPanResponderTerminate:()=>{animate(settled.current);unlock();},
 });
 const deleteItem=async()=>{if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await api(`/transactions/${item.id}`,'DELETE');setRemove(false);await finance.refresh();}catch(failure){setError(failure instanceof Error?failure.message:t('Không lưu được giao dịch.'));}finally{pending.current=false;setBusy(false);}};
 return <><View {...pan.panHandlers} onTouchEnd={unlock} onTouchCancel={unlock} style={{borderRadius:20,overflow:'hidden'}}>
  <View ref={node=>{if(Platform.OS==='web')(node as unknown as HTMLElement|null)?.setAttribute('translate','no');}} aria-hidden={!open} pointerEvents={open?'auto':'none'} accessibilityElementsHidden={!open} importantForAccessibility={open?'auto':'no-hide-descendants'} style={{position:'absolute',top:0,bottom:0,...(side==='left'?{left:0}:{right:0}),width:reveal,flexDirection:'row',gap:8,padding:4}}>
   <Pressable onStartShouldSetResponderCapture={()=>{actionTouched.current=true;keepTransactionInteraction();return false;}} disabled={!open} accessibilityRole="button" accessibilityLabel={t('Sửa giao dịch')} onPress={()=>{animate(0);setEdit(true);}} style={{flex:1,backgroundColor:'#FBBF24',borderRadius:16,alignItems:'center',justifyContent:'center',gap:6}}><Feather name="edit-2" size={20} color="#422006"/><Text style={{color:'#422006',fontWeight:'700',fontSize:13}} translateContent={false}>{t('Sửa')}</Text></Pressable>
   <Pressable onStartShouldSetResponderCapture={()=>{actionTouched.current=true;keepTransactionInteraction();return false;}} disabled={!open} accessibilityRole="button" accessibilityLabel={t('Xoá giao dịch')} onPress={()=>{animate(0);setRemove(true);setError('');}} style={{flex:1,backgroundColor:'#EF4444',borderRadius:16,alignItems:'center',justifyContent:'center',gap:6}}><Feather name="trash-2" size={20} color="white"/><Text style={{color:'white',fontWeight:'700',fontSize:13}} translateContent={false}>{t('Xoá')}</Text></Pressable>
  </View>
  <Animated.View style={{transform:[{translateX:translation}],backgroundColor:c.card,borderRadius:20}}><Pressable accessibilityRole="button" accessibilityLabel={t('Thao tác giao dịch')} accessibilityState={{expanded:open}} onPress={()=>animate(open?0:-reveal)}>{children}</Pressable></Animated.View>
 </View>
 {edit&&finance.data?.profile&&<TransactionForm transaction={item} type={item.type} profile={finance.data.profile} api={api} onClose={()=>{setEdit(false);if(saved.current){saved.current=false;void finance.refresh();}}} onSaved={async()=>{saved.current=true;}}/>}
 {remove&&<Sheet title="Xoá giao dịch?" canClose={!busy} onClose={()=>{if(!pending.current)setRemove(false);}}><Card><Label>{item.category}</Label><Label>{money(item.amount,item.currency)} · {dateLabel(item.date)}</Label><Label muted>Giao dịch sẽ bị xoá khỏi sổ thu chi. Bạn có chắc chắn không?</Label>{!!error&&<Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text>}<Button title={busy?'Đang xử lý…':'Xoá giao dịch'} disabled={busy} onPress={()=>void deleteItem()}/><Button title="Hủy" secondary disabled={busy} onPress={()=>setRemove(false)}/></Card></Sheet>}
 </>;
}
