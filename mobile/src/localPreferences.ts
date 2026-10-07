import type {Appearance} from './appearance';
import type {Language} from './i18n';
export type PreferenceStore={getItemAsync:(key:string)=>Promise<string|null>;setItemAsync:(key:string,value:string)=>Promise<void>};
export const preferenceKeys={appearance:'peacee1.theme',accent:'peacee1.accent',language:'peacee1.language'};
export async function loadPreferences(storage:PreferenceStore){
 const [mode,color,locale]=await Promise.all(Object.values(preferenceKeys).map(key=>storage.getItemAsync(key)));
 const appearance:Appearance=mode==='dark'||mode==='system'?mode:'light';
 const accent=mode==='monochrome'?'monochrome':['purple','pink','green','blue','yellow','monochrome'].includes(color||'')?color!:'monochrome';
 const language:Language=['vi','en','zh','ja','ko','ru'].includes(locale||'')?locale as Language:'en';
 const result={appearance,accent,language};
 // Renew cookies and migrate old device preferences without blocking app startup if persistence is unavailable.
 await Promise.allSettled(Object.entries(result).map(([key,value])=>storage.setItemAsync(preferenceKeys[key as keyof typeof preferenceKeys],value)));
 return result;
}
export function createWebPreferenceStore(doc:{cookie:string},storage:Pick<Storage,'getItem'|'setItem'>,secure=true):PreferenceStore{
 return {
  async getItemAsync(key){
   const pair=doc.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith(key+'='));
   if(pair)try{return decodeURIComponent(pair.slice(key.length+1));}catch{/* Fall back to the local copy. */}
   try{return storage.getItem(key)||(key===preferenceKeys.appearance?storage.getItem('theme'):null);}catch{return null;}
  },
  async setItemAsync(key,value){
   doc.cookie=key+'='+encodeURIComponent(value)+'; Path=/; Max-Age=34560000; SameSite=Lax'+(secure?'; Secure':'');
   try{storage.setItem(key,value);}catch{if(!doc.cookie.split(';').some(part=>part.trim()===key+'='+encodeURIComponent(value)))throw Error('Không lưu được cài đặt trên thiết bị.');}
  }
 };
}
