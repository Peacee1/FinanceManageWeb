const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function load(name,extra={}){const window={addEventListener(){}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../'+name),'utf8'),{window,...extra});return window;}
test('has 60 original reminders and holds each one for five minutes',()=>{
 const p=load('focus-presentation.js').FocusPresentation;
 assert.equal(p.quotes.length,60);assert.equal(new Set(p.quotes).size,60);
 assert.match(p.message(0),/Không làm phiền/);assert.match(p.message(299),/cắm sạc/);
 assert.equal(p.message(300),p.quotes[0]);assert.equal(p.message(599),p.quotes[0]);assert.equal(p.message(600),p.quotes[1]);assert.equal(p.message(18300),p.quotes[0]);
});
test('clock and its reminder fit both landscape and portrait',()=>{
 const p=load('focus-presentation.js').FocusPresentation;
 for(const [w,h]of [[390,844],[844,390],[667,375],[320,568]]){const box=p.layout(w,h);assert.equal(box.x+box.size/2,w/2);assert.ok(box.y>=0);assert.ok(box.y+box.size+65<h);}
});
test('dragging coalesces moves into one frame and ignores crossing the center',()=>{
 let frame,requests=0,seconds=1500,dragging=false;
 const window=load('focus-dial.js',{requestAnimationFrame:fn=>{frame=fn;requests++;return requests;},cancelAnimationFrame(){}});
 const handle={style:{},parentElement:{getBoundingClientRect:()=>({left:0,top:0,width:200,height:200})},setPointerCapture(){},releasePointerCapture(){}};
 window.FocusDial.attach(handle,{readSeconds:()=>seconds,onTime:value=>seconds=value,onDragging:value=>dragging=value,isRunning:()=>false});
 const event=(x,y)=>({clientX:x,clientY:y,pointerId:1,isPrimary:true,preventDefault(){},stopPropagation(){}});
 handle.onpointerdown(event(100,0));assert.equal(dragging,true);
 handle.onpointermove(event(150,10));handle.onpointermove(event(180,60));handle.onpointermove(event(200,100));assert.equal(requests,1);frame();assert.equal(seconds,2400);
 handle.onpointermove(event(100,100));frame();handle.onpointermove(event(0,100));frame();assert.equal(seconds,2400);
 handle.onpointerup(event(0,100));assert.equal(dragging,false);
 assert.ok(window.FocusDial.delta(3.13,-3.13)>0);assert.ok(window.FocusDial.delta(3.13,-3.13)<.03);
});
