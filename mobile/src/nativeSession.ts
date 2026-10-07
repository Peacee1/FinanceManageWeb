import type { Session } from './types.ts';

export const NATIVE_SESSION_KEY = 'peacee1.session.v1';
type Storage = { getItemAsync:(key:string)=>Promise<string|null>; setItemAsync:(key:string,value:string)=>Promise<void>; deleteItemAsync:(key:string)=>Promise<void> };

export function createNativeSessionClient(base:string,storage:Storage,fetcher:typeof fetch=fetch) {
  let flight:Promise<Session|null>|null=null;
  let generation=0;
  let writes:Promise<void>=Promise.resolve();
  const write=(operation:()=>Promise<void>)=>{const next=writes.catch(()=>{}).then(operation);writes=next;return next;};
  const save=async(session:Session)=>{generation++;await write(()=>storage.setItemAsync(NATIVE_SESSION_KEY,JSON.stringify(session)));};
  const load=async()=>{
    const raw=await storage.getItemAsync(NATIVE_SESSION_KEY);
    if(!raw)return null;
    const session=JSON.parse(raw) as Session;
    if(typeof session.token!=='string'||session.user?.role!=='owner'||!Number.isSafeInteger(session.user.id))throw Error('Invalid stored session');
    return session;
  };
  const clear=async()=>{generation++;await write(()=>storage.deleteItemAsync(NATIVE_SESSION_KEY));};
  const logout=async()=>{
    const session=await load();
    await clear();
    if(!session?.refreshToken)return;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{await fetcher(base+'/auth/native-logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken}),signal:controller.signal});}
    catch{/* Local credentials are already removed even when offline. */}
    finally{clearTimeout(timer);}
  };
  const upgrade=async(session:Session)=>{
    if(session.refreshToken)return session;
    const currentGeneration=generation;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetcher(base+'/auth/native-session',{method:'POST',headers:{Authorization:'Bearer '+session.token},signal:controller.signal});
      if(!response.ok)return session;
      const data=await response.json() as {refreshToken?:string};
      if(typeof data.refreshToken!=='string'||currentGeneration!==generation)return session;
      const next={...session,refreshToken:data.refreshToken};
      await write(async()=>{if(currentGeneration===generation)await storage.setItemAsync(NATIVE_SESSION_KEY,JSON.stringify(next));});
      return next;
    }catch{return session;}
    finally{clearTimeout(timer);}
  };
  const refresh=():Promise<Session|null>=>{
    if(flight)return flight;
    const currentGeneration=generation;
    flight=(async()=>{
      const session=await load();
      if(!session?.refreshToken)return null;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{
        const response=await fetcher(base+'/auth/native-refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken}),signal:controller.signal});
        if(response.status===401)return null;
        if(!response.ok)throw Error('Không gia hạn được phiên. Kiểm tra kết nối và thử lại.');
        const next=await response.json() as Session;
        if(typeof next.token!=='string'||typeof next.refreshToken!=='string'||next.user?.id!==session.user.id)throw Error('Invalid refresh response');
        if(currentGeneration!==generation)return null;
        await write(async()=>{if(currentGeneration===generation)await storage.setItemAsync(NATIVE_SESSION_KEY,JSON.stringify(next));});
        return currentGeneration===generation?next:null;
      }finally{clearTimeout(timer);}
    })().finally(()=>{flight=null;});
    return flight;
  };
  return {load,save,clear,refresh,logout,upgrade};
}
