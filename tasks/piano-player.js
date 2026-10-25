(function(global){
  function create(context,buffer,destination){
    let stopped=false,source=null,envelope=null;
    function playAt(start){
      if(stopped)return;
      source=context.createBufferSource();envelope=context.createGain();
      source.buffer=buffer;source.loop=false;
      const currentSource=source,currentEnvelope=envelope,end=start+buffer.duration;
      currentEnvelope.gain.setValueAtTime(1,start);
      currentEnvelope.gain.setValueAtTime(1,Math.max(start,end-2));
      currentEnvelope.gain.linearRampToValueAtTime(0,end);
      currentSource.connect(currentEnvelope);currentEnvelope.connect(destination);
      currentSource.onended=()=>{
        currentSource.disconnect();currentEnvelope.disconnect();
        if(!stopped)playAt(Math.max(end+2,context.currentTime+.01));
      };
      currentSource.start(start);
    }
    playAt(context.currentTime+.02);
    return {stop(){stopped=true;if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();}envelope?.disconnect();}};
  }
  global.PianoPlayer={create};
})(window);
