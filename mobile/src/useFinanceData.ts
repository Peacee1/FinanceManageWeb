import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import type {Api} from './api';
import type {Profile,Summary,Transaction} from './types';
type Data={owner:string;month:string;profile:Profile;summary:Summary;transactions:Transaction[];unread:number};
export function useFinanceData(api:Api,clear:()=>void,owner:string,month:string){
 const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const version=useRef(0);
 const refresh=useCallback(async()=>{
  if(!owner)return;
  const current=++version.current;clear();
  try{
   setLoading(true);setError('');await api(`/users/bootstrap?month=${encodeURIComponent(month)}`);
   const {data:profile}=await api<Profile>('/users/me');if(current!==version.current)return;const [year,monthNumber]=month.split('-');
   const scope=`scope=${profile.finance_mode}&year=${year}&month=${monthNumber}`;
   const list=async()=>{const rows:Transaction[]=[];let cursor:string|null=null;do{const response:{data:Transaction[];nextCursor:string|null}=await api<Transaction[]>(`/transactions?${scope}&limit=500${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);rows.push(...response.data);if(response.nextCursor===cursor&&cursor)throw new Error('Không tải được trang giao dịch tiếp theo.');cursor=response.nextCursor;if(current!==version.current)return [];}while(cursor);return rows;};
   const [transactions,{data:summary},{data:notices}]=await Promise.all([list(),api<Summary>(`/transactions/summary?${scope}`),api<{unread:number}>('/users/notifications')]);
   if(current===version.current)setData({owner,month,profile,summary,transactions,unread:notices.unread});
  }catch(failure){if(current===version.current)setError(failure instanceof Error?failure.message:'Không tải được dữ liệu.');}finally{if(current===version.current)setLoading(false);}
 },[api,clear,owner,month]);
 useEffect(()=>{const currentVersion=version;let active=true;void Promise.resolve().then(()=>{if(active)return refresh();});return()=>{active=false;currentVersion.current++;};},[refresh]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>listener.remove();},[refresh]);
 const setUnread=useCallback((unread:number)=>setData(current=>current?{...current,unread}:current),[]);
 return {data:data?.owner===owner&&data.month===month?data:null,loading,error,refresh,setUnread};
}


