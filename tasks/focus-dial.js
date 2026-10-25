(function(global){
  const tau=Math.PI*2;
  function delta(previous,next){let value=next-previous;if(value>Math.PI)value-=tau;if(value<-Math.PI)value+=tau;return value;}
  function attach(handle,{readSeconds,onTime,onDragging,isRunning}){
    let pointer=null,center=null,last=null,total=0,start=0,frame=null,pending=null,lastSeconds=0;
    function sample(event){const x=event.clientX-center.x,y=event.clientY-center.y;if(Math.hypot(x,y)<center.radius*.25){last=null;return;}const next=Math.atan2(x,-y);if(last!==null)total+=delta(last,next);last=next;const raw=Math.max(60,Math.min(86400,start+total/tau*3600)),seconds=Math.round(raw/60)*60,a=raw/3600*tau;handle.style.left=(50+50*Math.sin(a))+'%';handle.style.top=(50-50*Math.cos(a))+'%';if(seconds!==lastSeconds){lastSeconds=seconds;onTime(seconds);}}
    function flush(){frame=null;if(pending){sample(pending);pending=null;}}
    function end(event){if(pointer===null||event&&event.pointerId!==pointer)return;if(frame!==null){cancelAnimationFrame(frame);frame=null;}if(pending){sample(pending);pending=null;}const id=pointer;pointer=null;last=null;try{handle.releasePointerCapture(id);}catch{}onDragging(false);onTime(lastSeconds);}
    handle.onpointerdown=event=>{if(isRunning()||pointer!==null||event.isPrimary===false)return;event.preventDefault();event.stopPropagation();const rect=handle.parentElement.getBoundingClientRect();center={x:rect.left+rect.width/2,y:rect.top+rect.height/2,radius:rect.width/2};pointer=event.pointerId;start=readSeconds();lastSeconds=start;total=0;last=Math.atan2(event.clientX-center.x,-(event.clientY-center.y));handle.setPointerCapture(pointer);onDragging(true);};
    handle.onpointermove=event=>{if(pointer!==event.pointerId)return;event.preventDefault();pending={clientX:event.clientX,clientY:event.clientY};if(frame===null)frame=requestAnimationFrame(flush);};
    handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=end;
    handle.onkeydown=event=>{if(isRunning())return;if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','PageUp','PageDown','Home'].includes(event.key)){event.preventDefault();onTime(event.key==='Home'?60:Math.max(60,Math.min(86400,readSeconds()+(event.key==='PageUp'?3600:event.key==='PageDown'?-3600:['ArrowRight','ArrowUp'].includes(event.key)?60:-60))));}};
  }
  global.FocusDial={attach,delta};
})(window);
