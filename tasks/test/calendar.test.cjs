const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function calendar(){const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../calendar.js'),'utf8'),{window,Date});return window.TaskCalendar;}
test('uses Monday-first placement and correct leap-year day counts',()=>{
 const c=calendar();assert.equal(c.model('2026-10').offset,3);assert.equal(c.model('2026-10').days.length,31);assert.equal(c.model('2028-02').days.length,29);
});
test('selecting a date shows only its tasks below the fixed date grid',()=>{
 const c=calendar();c.select('2026-10-25');const long='A'.repeat(200);
 const html=c.render([{id:1,title:long,due_date:'2026-10-25'},{id:2,title:'Other day',due_date:'2026-10-26'}],t=>`<article>${t.title}</article>`,v=>v);
 const grid=html.split('</section>')[0];assert.equal(grid.includes(long),false);assert.equal(html.includes(long),true);assert.equal(html.includes('Other day'),false);assert.match(html,/aria-pressed="true"/);
});
test('month navigation crosses years correctly',()=>{
 const c=calendar();c.select('2026-12-12');c.shift(1);assert.match(c.render([],()=>'',v=>v),/data-calendar-day="2027-01-01"/);
 c.shift(-1);assert.match(c.render([],()=>'',v=>v),/data-calendar-day="2026-12-01"/);
});
