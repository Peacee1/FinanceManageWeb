import test from 'node:test';
import assert from 'node:assert/strict';
import {checkinProgress,checkinWeek} from '../src/dailyTasks.ts';
test('check-in reward follows server streak milestones and resets after a missed day',()=>{
 assert.equal(checkinProgress('2026-10-01',6,'2026-10-02').reward,100);
 assert.equal(checkinProgress('2026-10-01',29,'2026-10-02').reward,500);
 assert.deepEqual(checkinProgress('2026-09-30',29,'2026-10-02'),{done:false,currentStreak:0,reward:20});
 assert.equal(checkinProgress('2026-10-02T00:00:00.000Z',7,'2026-10-02').done,true);
 assert.equal(checkinProgress('2026-09-30',6,'2026-10-01').reward,100);
});
test('weekly check-in marks only dates covered by the actual server streak',()=>{
 const week=checkinWeek('2026-10-02','2026-10-01',2);
 assert.equal(week[0].date,'2026-09-28');
 assert.equal(week[6].date,'2026-10-04');
 assert.deepEqual(week.filter(item=>item.claimed).map(item=>item.date),['2026-09-30','2026-10-01']);
 assert.equal(week.find(item=>item.date==='2026-10-02')?.claimed,false);
 assert.ok(checkinWeek('2026-10-02',null,0).every(item=>!item.claimed));
});
