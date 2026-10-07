import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readWebSession,saveWebSession,clearWebSession} from '../src/webSession.ts';
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};}
test('existing website owner session survives reload and logout retains appearance',()=>{const s=storage();const session={token:'test-token',user:{id:7,name:'Owner',email:'owner@example.com',role:'owner' as const}};s.setItem('peacee1.theme','dark');saveWebSession(s,session);assert.deepEqual(readWebSession(s),session);clearWebSession(s);assert.equal(readWebSession(s),null);assert.equal(s.getItem('peacee1.theme'),'dark');});
test('malformed user is discarded without blocking startup',()=>{const s=storage();s.setItem('token','test-token');s.setItem('user','{broken');assert.equal(readWebSession(s),null);assert.equal(s.getItem('token'),null);});
