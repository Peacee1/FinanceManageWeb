import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Linking,Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import {reminderContent} from './reminderContent';
import type {Language} from './i18n';
export type ReminderStatus='enabled'|'denied'|'error'|'loading'|'web';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
const ids=['peacee1-checkin','peacee1-expense'];
let queue:Promise<unknown>=Promise.resolve();
export function useReminders(userId:number|undefined,language:Language){
 const [status,setStatus]=useState<ReminderStatus>('loading');
 const revision=useRef(0),asked=useRef(new Set<number>());
 const sync=useCallback((request=false)=>{
  const version=++revision.current;
  const work=async()=>{
   if(version!==revision.current)return;
   await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id)));

   if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('daily-reminders',{name:'Peacee1',importance:Notifications.AndroidImportance.DEFAULT,sound:'default'});
   let permission=await Notifications.getPermissionsAsync();
   if(!request&&!asked.current.has(0)&&await SecureStore.getItemAsync('peacee1.notifications-requested')==='1')asked.current.add(0);
   if(!permission.granted&&permission.canAskAgain&&(request||!asked.current.has(0))){asked.current.add(0);await SecureStore.setItemAsync('peacee1.notifications-requested','1');permission=await Notifications.requestPermissionsAsync();}
   if(version!==revision.current)return;
   if(!permission.granted){setStatus('denied');if(request&&!permission.canAskAgain)await Linking.openSettings();return;}
   if(!userId){setStatus('enabled');return;}
   try{
    for(const item of reminderContent(language)){
     await Notifications.scheduleNotificationAsync({identifier:item.id,content:{title:'Peacee1',body:item.body,sound:'default',data:{target:item.target,ownerId:userId}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:item.hour,minute:0,channelId:'daily-reminders'}});
    }
    if(version===revision.current)setStatus('enabled');
   }catch(error){await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id)));throw error;}
  };
  queue=queue.catch(()=>{}).then(work).catch(()=>{if(version===revision.current)setStatus('error');});
  return queue.then(()=>{});
 },[userId,language]);
 useEffect(()=>{const currentRevision=revision;void sync();const listener=AppState.addEventListener('change',state=>{if(state==='active')void sync();});return()=>{currentRevision.current++;listener.remove();};},[sync]);
 return {reminderStatus:status,enableReminders:()=>sync(true)};
}
export function useReminderResponse(userId:number|undefined,onTarget:(target:'checkin'|'expense')=>void){
 const callback=useRef(onTarget);useEffect(()=>{callback.current=onTarget;},[onTarget]);
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  const respond=(response:Notifications.NotificationResponse|null)=>{
   const data=response?.notification.request.content.data;
   if(!active||Number(data?.ownerId)!==userId||(data?.target!=='checkin'&&data?.target!=='expense'))return;
   callback.current(data.target);void Notifications.clearLastNotificationResponseAsync();
  };
  void Notifications.getLastNotificationResponseAsync().then(respond).catch(()=>{});
  const listener=Notifications.addNotificationResponseReceivedListener(respond);
  return()=>{active=false;listener.remove();};
 },[userId]);
}




