(() => {
  const scene=document.querySelector('.universe'),canvas=document.getElementById('stars'),ctx=canvas.getContext('2d'),explore=document.getElementById('explore'),moons=Array.from(scene.querySelectorAll('.moon'));
  const orbits=[{radius:37,speed:.00022,phase:2.5,tilt:.46},{radius:47,speed:-.00014,phase:-.8,tilt:.46},{radius:55,speed:.000105,phase:3.5,tilt:.48},{radius:29,speed:-.0003,phase:.9,tilt:.6},{radius:63,speed:.000085,phase:-2.2,tilt:.42}];
  let width=0,height=0,stars=[],frame=0,pointer={x:0,y:0},clockOrigin=performance.now(),orbitTime=0,orbitSize=0;
  function resize(){width=scene.clientWidth;height=scene.clientHeight;orbitSize=scene.querySelector(".celestial").clientWidth;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);let seed=41;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};stars=Array.from({length:Math.min(340,Math.floor(width*height/2600))},()=>({x:random()*width,y:random()*height,r:random()*1.1+.25,a:random()*.55+.2,phase:random()*6.28,depth:random(),speed:random()*.001+.0005}));draw();}
  function draw(){
    moons.forEach((moon,index)=>{const orbit=orbits[index],angle=orbitTime*orbit.speed+orbit.phase,depth=Math.sin(angle);moon.style.transform=`translate3d(${Math.cos(angle)*orbit.radius*orbitSize/100}px,${depth*orbit.radius*orbit.tilt*orbitSize/100}px,0) translate(-50%,-50%) scale(${.86+depth*.14})`;moon.style.zIndex=depth>0?'3':'0';});
    ctx.clearRect(0,0,width,height);
    for(const s of stars){const wave=(Math.sin(orbitTime*s.speed+s.phase)+1)/2,glow=s.a*(.15+.85*wave),x=s.x+pointer.x*s.depth*14,y=s.y+pointer.y*s.depth*14;ctx.fillStyle=`rgba(215,226,255,${glow})`;ctx.beginPath();ctx.arc(x,y,s.r*(.8+wave*.25),0,Math.PI*2);ctx.fill();if(s.r>1.05&&wave>.76){ctx.strokeStyle=`rgba(190,211,255,${(wave-.76)*1.3})`;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}}
    for(let i=0;i<2;i++){const cycle=(orbitTime+i*5700)%14500,progress=cycle/1700;if(progress>1)continue;const startX=width*(.65+i*.19),startY=height*(.08+i*.1),distance=Math.max(width*.55,280),x=startX-progress*distance,y=startY+progress*distance*.55,opacity=Math.sin(progress*Math.PI)*.65,gradient=ctx.createLinearGradient(x,y,x+100,y-55);gradient.addColorStop(0,`rgba(232,240,255,${opacity})`);gradient.addColorStop(1,'rgba(190,210,255,0)');ctx.strokeStyle=gradient;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+100,y-55);ctx.stroke();ctx.fillStyle=`rgba(255,245,233,${opacity})`;ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();}
  }
  function loop(time){orbitTime=time-clockOrigin;draw();frame=requestAnimationFrame(loop);}
  function motion(){cancelAnimationFrame(frame);clockOrigin=performance.now()-orbitTime;scene.classList.toggle('paused',document.hidden);if(!document.hidden)frame=requestAnimationFrame(loop);}
  scene.addEventListener('pointermove',event=>{pointer={x:Math.max(-.5,Math.min(.5,event.clientX/width-.5)),y:Math.max(-.5,Math.min(.5,event.clientY/height-.5))};},{passive:true});
  scene.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  let cameraRunning=false;
  explore.addEventListener('click',()=>{
    if(cameraRunning)return;
    cameraRunning=true;
    const active=!scene.classList.contains('immersive'),world=scene.querySelector('.celestial');
    const before=getComputedStyle(world),from={left:before.left,top:before.top,transform:before.transform};
    scene.classList.toggle('immersive',active);
    const after=getComputedStyle(world),to={left:after.left,top:after.top,transform:after.transform};
    const options={duration:2800,easing:'cubic-bezier(.22,.61,.36,1)'};
    world.animate([from,to],options).finished.finally(()=>{cameraRunning=false;});
    canvas.animate([{transform:active?'translate(0,0) scale(1)':'translate(-12%,3%) scale(1.28)'},{transform:active?'translate(-12%,3%) scale(1.28)':'translate(0,0) scale(1)'}],{...options,fill:'forwards'});
    for(const layer of scene.querySelectorAll('.space-mist,.cosmic-haze'))layer.animate([{transform:active?'translateX(0) scale(1)':'translateX(-8%) scale(1.15)'},{transform:active?'translateX(-8%) scale(1.15)':'translateX(0) scale(1)'}],{...options,fill:'forwards'});
    for(const text of scene.querySelectorAll('.intro>:not(#explore)'))text.animate([{opacity:active?1:0,transform:active?'translate(0,0)':'translate(100px,-20px)'},{opacity:active?0:1,transform:active?'translate(100px,-20px)':'translate(0,0)'}],{duration:active?1600:2200,easing:'ease-in-out'});
    explore.setAttribute('aria-pressed',String(active));explore.querySelector('span:last-child').textContent=active?'Trở về':'Bước vào không gian';
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&scene.classList.contains('immersive'))explore.click();});
  document.addEventListener('visibilitychange',motion);window.addEventListener('resize',resize);resize();motion();
})();

