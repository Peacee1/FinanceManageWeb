import type {Api} from './api';
export function createCachedApi(source:Api){
 let revision=0;
 const cache=new Map<string,{data:unknown;nextCursor:string|null}>();
 const pending=new Map<string,Promise<{data:unknown;nextCursor:string|null}>>();
 const clear=()=>{revision++;cache.clear();pending.clear();};
 const api:Api=async<T>(path:string,method='GET',body?:unknown)=>{
  if(method!=='GET'){clear();try{return await source<T>(path,method,body);}finally{clear();}}
  if(cache.has(path))return cache.get(path)! as {data:T;nextCursor:string|null};
  const version=revision;
  if(!pending.has(path)){
   const request=source(path).then(response=>{if(version===revision){cache.set(path,response);if(path.startsWith('/users/bootstrap?')){const entries=(response.data as {entries?:[string,{data:unknown;nextCursor:string|null}][]}).entries;for(const [key,value] of entries||[])cache.set(key,value);}}return response;}).finally(()=>{if(version===revision)pending.delete(path);});
   pending.set(path,request);
  }
  return await pending.get(path)! as {data:T;nextCursor:string|null};
 };
 return {api,clear};
}
