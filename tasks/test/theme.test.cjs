const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../theme.js'),'utf8');
function launch(values={}){const saved=new Map(Object.entries(values)),window={};vm.runInNewContext(script,{window,localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},document:{addEventListener(){}}});return {saved,theme:window.TaskTheme};}
test('migrates the original colorful defaults to neutral Money colors once',()=>{
 const {saved,theme}=launch({'peacee1-tasks-theme':'purple','peacee1-tasks-appearance':'dark'});
 assert.equal(saved.get('peacee1-tasks-theme'),'monochrome');assert.equal(saved.get('peacee1-tasks-appearance'),'light');
 assert.equal(theme.colors(false).bg,'#F1F0EC');assert.equal(theme.colors(true).bg,'#171716');
 assert.equal(theme.colors(true).onAccent,'#191918');
});
test('does not overwrite later appearance choices on subsequent launches',()=>{
 const {saved}=launch({'peacee1-tasks-monochrome-v1':'1','peacee1-tasks-theme':'monochrome','peacee1-tasks-appearance':'dark'});
 assert.equal(saved.get('peacee1-tasks-appearance'),'dark');
});
