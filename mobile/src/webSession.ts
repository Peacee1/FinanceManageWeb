import type {Session} from './types';
type Storage = Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
export function clearWebSession(storage:Storage){storage.removeItem('token');storage.removeItem('user');storage.removeItem('peacee1.session.v1');}
export function readWebSession(storage:Storage):Session|null{
 const token=storage.getItem('token'),raw=storage.getItem('user');
 if(!token||!raw)return null;
 try{const user=JSON.parse(raw);if(user?.role==='owner'&&Number.isInteger(user.id))return {token,user};}catch{}
 clearWebSession(storage);return null;
}
export function saveWebSession(storage:Storage,session:Session){storage.setItem('user',JSON.stringify(session.user));storage.setItem('token',session.token);}
