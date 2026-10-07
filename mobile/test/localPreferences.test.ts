import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPreferences,createWebPreferenceStore} from '../src/localPreferences.ts';
const storage=(values:Record<string,string>={})=>({getItemAsync:async(key:string)=>values[key]??null,setItemAsync:async(key:string,value:string)=>{values[key]=value;}});
test('first launch defaults to light monochrome and English, persisting across restarts',async()=>{
 const store=storage();const expected={appearance:'light',accent:'monochrome',language:'en'};
 assert.deepEqual(await loadPreferences(store),expected);assert.deepEqual(await loadPreferences(store),expected);
});
test('restores local preferences and migrates legacy monochrome display mode',async()=>{
 assert.deepEqual(await loadPreferences(storage({'peacee1.theme':'dark','peacee1.accent':'pink','peacee1.language':'vi'})),{appearance:'dark',accent:'pink',language:'vi'});
 assert.deepEqual(await loadPreferences(storage({'peacee1.theme':'monochrome','peacee1.accent':'pink','peacee1.language':'ja'})),{appearance:'light',accent:'monochrome',language:'ja'});
 assert.deepEqual(await loadPreferences(storage({'peacee1.theme':'bad','peacee1.accent':'bad','peacee1.language':'bad'})),{appearance:'light',accent:'monochrome',language:'en'});
});
test('web cookies take precedence over old storage and writes have persistence/security attributes',async()=>{
 const doc={cookie:'peacee1.language=en; unrelated=keep'};const values:Record<string,string>={'peacee1.language':'vi'};
 const web=createWebPreferenceStore(doc,{getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;}});
 assert.equal(await web.getItemAsync('peacee1.language'),'en');
 await web.setItemAsync('peacee1.accent','monochrome');assert.match(doc.cookie,/Path=\/; Max-Age=34560000; SameSite=Lax; Secure/);assert.equal(values['peacee1.accent'],'monochrome');
});
