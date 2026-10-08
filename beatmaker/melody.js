const melodyState={voice:'triangle',volume:.45,mute:false,notes:[]};
let selectedNote=null;
const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
function noteLength(){const length=Math.max(1,Math.min(16,Math.round(Number($('note-length').value)||1)));$('note-length').value=length;return length;}
function noteLabel(pitch){return noteNames[pitch%12]+Math.floor(pitch/12-1);}
function stepDuration(start,length,tempo=bpm(),swing=Number($('swing').value)){
 let duration=0;for(let i=start;i<start+length;i++)duration+=60/tempo/4*(i%2?1-swing/100:1+swing/100);return duration;
}
function synthNote(ctx,out,pitch,time,duration){
 const oscillator=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
 oscillator.type=melodyState.voice;oscillator.frequency.value=440*2**((pitch-69)/12);filter.type='lowpass';filter.frequency.value=3000;
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(melodyState.volume*.18,time+.012);gain.gain.setValueAtTime(melodyState.volume*.12,time+Math.max(.013,duration-.03));gain.gain.linearRampToValueAtTime(0,time+duration+.08);
 oscillator.connect(filter);filter.connect(gain);gain.connect(out);oscillator.start(time);oscillator.stop(time+duration+.09);oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();};
}
function scheduleMelody(ctx,out,step,time,tempo=bpm(),swing=Number($('swing').value)){
 if(melodyState.mute)return;melodyState.notes.filter(note=>note.start===step).forEach(note=>synthNote(ctx,out,note.pitch,time,stepDuration(note.start,note.length,tempo,swing)));
}
async function previewNote(pitch){try{await initAudio();master.gain.setValueAtTime(Number($('master').value)/100,context.currentTime);synthNote(context,master,pitch,context.currentTime,.25);}catch{status('Không thể nghe thử nốt lúc này.');}}
function renderMelody(){
 const roll=$('piano-roll');roll.replaceChildren();
 for(let pitch=72;pitch>=60;pitch--){
  const row=document.createElement('div');row.className='piano-row';const key=document.createElement('button');key.className='piano-key'+([1,3,6,8,10].includes(pitch%12)?' black':'');key.textContent=noteLabel(pitch);key.onclick=()=>previewNote(pitch);row.append(key);
  const lane=document.createElement('div');lane.className='piano-lane';
  for(let step=0;step<16;step++){const cell=document.createElement('button');cell.className='piano-cell'+(step%4===0?' bar':'');cell.dataset.step=step;cell.setAttribute('aria-label',`${noteLabel(pitch)}, bước ${step+1}: thêm nốt`);cell.onclick=()=>{const requested=Math.min(noteLength(),16-step);const next=melodyState.notes.filter(n=>n.pitch===pitch&&n.start>step).sort((a,b)=>a.start-b.start)[0];const length=Math.min(requested,next?next.start-step:16-step);const note={pitch,start:step,length};melodyState.notes.push(note);selectedNote=note;renderMelody();previewNote(pitch);window.projectChanged?.();};lane.append(cell);}
  melodyState.notes.filter(n=>n.pitch===pitch).forEach(note=>{const button=document.createElement('button');button.className='melody-note'+(selectedNote===note?' selected':'');button.style.left=`${note.start/16*100}%`;button.style.width=`${note.length/16*100}%`;button.textContent=noteLabel(pitch);button.setAttribute('aria-label',`${noteLabel(pitch)}, bước ${note.start+1}, dài ${note.length} bước. Chọn để chỉnh, nhấn Delete để xóa.`);button.onclick=()=>{selectedNote=note;$('note-length').value=note.length;renderMelody();previewNote(pitch);};const handle=document.createElement('span');handle.className='note-handle';handle.textContent='⋮';handle.title='Kéo để đổi độ dài';handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();selectedNote=note;handle.setPointerCapture(e.pointerId);const rect=lane.getBoundingClientRect();const resize=event=>{const end=Math.round((event.clientX-rect.left)/rect.width*16);const next=melodyState.notes.filter(n=>n.pitch===pitch&&n.start>note.start).sort((a,b)=>a.start-b.start)[0];note.length=Math.max(1,Math.min(next?next.start:16,end)-note.start);button.style.width=`${note.length/16*100}%`;$('note-length').value=note.length;};const finish=()=>{handle.removeEventListener('pointermove',resize);renderMelody();window.projectChanged?.();};handle.addEventListener('pointermove',resize);handle.addEventListener('pointerup',finish,{once:true});handle.addEventListener('pointercancel',finish,{once:true});};button.append(handle);lane.append(button);});row.append(lane);roll.append(row);
 }
 $('melody-count').textContent=melodyState.notes.length+' nốt';
}
$('note-length').onchange=()=>{if(selectedNote){const next=melodyState.notes.filter(n=>n.pitch===selectedNote.pitch&&n.start>selectedNote.start).sort((a,b)=>a.start-b.start)[0];selectedNote.length=Math.min(noteLength(),(next?next.start:16)-selectedNote.start);renderMelody();window.projectChanged?.();}};
$('melody-voice').onchange=e=>{melodyState.voice=e.target.value;window.projectChanged?.();};
$('melody-volume').oninput=e=>{melodyState.volume=Number(e.target.value)/100;window.projectChanged?.();};
$('melody-mute').onchange=e=>{melodyState.mute=!e.target.checked;window.projectChanged?.();};
function deleteNote(){if(!selectedNote)return;melodyState.notes=melodyState.notes.filter(n=>n!==selectedNote);selectedNote=null;renderMelody();window.projectChanged?.();}
$('delete-note').onclick=deleteNote;$('clear-melody').onclick=()=>{melodyState.notes=[];selectedNote=null;renderMelody();window.projectChanged?.();};
$('demo-melody').onclick=()=>{melodyState.notes=[{pitch:69,start:0,length:4},{pitch:72,start:4,length:4},{pitch:64,start:8,length:4},{pitch:67,start:12,length:4}];selectedNote=null;renderMelody();window.projectChanged?.();status('Melody mẫu La–Đô–Mi–Sol. Nhấn Phát beat để nghe cùng drum.');};
document.addEventListener('keydown',e=>{if(['Delete','Backspace'].includes(e.key)&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&$('melody-panel').contains(e.target)){e.preventDefault();deleteNote();}});
window.Melody={schedule:scheduleMelody,mark(step){document.querySelectorAll('.piano-cell').forEach(cell=>cell.classList.toggle('playhead',Number(cell.dataset.step)===step));},read(){return structuredClone(melodyState);},load(data){Object.assign(melodyState,structuredClone(data));selectedNote=null;$('melody-voice').value=data.voice;$('melody-volume').value=data.volume*100;$('melody-mute').checked=!data.mute;renderMelody();}};
renderMelody();
