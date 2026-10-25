(function(global){
  const localDay=()=>new Date().toLocaleDateString('sv-SE');
  let selected=localDay(),month=selected.slice(0,7);
  function model(value){
    const [year,m]=value.split('-').map(Number),count=new Date(year,m,0).getDate();
    const offset=(new Date(year,m-1,1).getDay()+6)%7;
    return {year,month:m,offset,days:Array.from({length:count},(_,i)=>`${value}-${String(i+1).padStart(2,'0')}`)};
  }
  function shift(delta){const [y,m]=month.split('-').map(Number),date=new Date(y,m-1+delta,1);month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;selected=localDay().startsWith(month)?localDay():month+'-01';}
  function select(day){if(/^\d{4}-\d{2}-\d{2}$/.test(day)){selected=day;month=day.slice(0,7);}}
  function render(items,card,esc){
    const data=model(month),today=localDay(),daily=items.filter(t=>t.due_date?.slice(0,10)===selected);
    return `<section class="month-card"><div class="month-heading"><h2>Tháng ${data.month}<span> / ${data.year}</span></h2><div><button data-calendar-nav="-1" aria-label="Tháng trước">‹</button><button data-calendar-today="true">Hôm nay</button><button data-calendar-nav="1" aria-label="Tháng sau">›</button></div></div><div class="month-grid">${['T2','T3','T4','T5','T6','T7','CN'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span class="month-blank" aria-hidden="true"></span>'.repeat(data.offset)}${data.days.map((day,i)=>{const tasks=items.filter(t=>t.due_date?.slice(0,10)===day);return `<button class="month-day ${day===selected?'selected':''} ${day===today?'today':''}" data-calendar-day="${day}" aria-pressed="${day===selected}" aria-label="${day}, ${tasks.length} công việc"><span>${i+1}</span><span class="day-markers" aria-hidden="true">${tasks.length?'<i></i>'.repeat(Math.min(tasks.length,3)):''}</span></button>`;}).join('')}</div></section><section class="day-agenda"><div class="agenda-heading"><h2>${selected===today?'Hôm nay':`Ngày ${Number(selected.slice(8))}/${Number(selected.slice(5,7))}`}</h2><span>${daily.length} công việc</span></div>${daily.length?daily.map(card).join(''):'<div class="agenda-empty">Chưa có công việc trong ngày này.</div>'}</section>`;
  }
  global.TaskCalendar={model,shift,select,render,today:()=>select(localDay())};
})(window);
