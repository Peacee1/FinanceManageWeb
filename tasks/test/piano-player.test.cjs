const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('fades the last two seconds, waits two seconds, and stops pending replay',()=>{
 const window={},sources=[],gains=[],context={currentTime:10,createBufferSource(){const source={connect(){},disconnect(){},start(at){this.startAt=at;},stop(){this.stopped=true;}};sources.push(source);return source;},createGain(){const events=[],gain={connect(){},disconnect(){},gain:{setValueAtTime:(v,t)=>events.push(['set',v,t]),linearRampToValueAtTime:(v,t)=>events.push(['ramp',v,t])},events};gains.push(gain);return gain;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../piano-player.js'),'utf8'),{window});
 const player=window.PianoPlayer.create(context,{duration:60},{}),start=sources[0].startAt,end=start+60;
 assert.equal(sources[0].loop,false);assert.deepEqual(gains[0].events,[['set',1,start],['set',1,end-2],['ramp',0,end]]);
 context.currentTime=end;sources[0].onended();assert.equal(sources[1].startAt,end+2);
 player.stop();assert.equal(sources[1].onended,null);assert.equal(sources[1].stopped,true);assert.equal(sources.length,2);
});
