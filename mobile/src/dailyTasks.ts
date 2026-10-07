export function checkinProgress(lastDate: string | null | undefined, streak: number, day: string) {
  const last = lastDate?.slice(0,10);
  const yesterday = new Date(`${day}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const done = last === day;
  const currentStreak = done || last === yesterday.toISOString().slice(0,10) ? Number(streak)||0 : 0;
  const nextStreak = done ? currentStreak : currentStreak+1;
  return { done, currentStreak, reward:nextStreak%30===0?500:nextStreak%7===0?100:20 };
}

export function checkinWeek(day: string, lastDate: string | null | undefined, streak: number) {
  const current = new Date(`${day}T00:00:00Z`);
  const monday = new Date(current);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
  const last = lastDate ? new Date(`${lastDate.slice(0,10)}T00:00:00Z`).getTime() : NaN;
  const first = last - (Math.max(0,streak)-1)*86400000;
  return Array.from({length:7},(_,index)=>{
    const date = new Date(monday);date.setUTCDate(date.getUTCDate()+index);
    return {date:date.toISOString().slice(0,10),label:['T2','T3','T4','T5','T6','T7','CN'][index],claimed:streak>0&&date.getTime()>=first&&date.getTime()<=last};
  });
}
