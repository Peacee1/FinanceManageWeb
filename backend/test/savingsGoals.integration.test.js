const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('crypto');
const db=require('../config/db');
const goals=require('../controllers/savingsGoalController');
const family=require('../controllers/familyController');
const {generateScheduledNotifications}=require('../services/notificationService');
after(()=>db.close());
const invoke=async(handler,user,body={},id,query={})=>{
 const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
 await handler({user,body,params:{id:String(id)},query},res,error=>{throw error;});return res;
};
const definition=(overrides={})=>({name:'Du lịch',targetAmount:1000,initialAmount:100,deadline:null,monthlyAmount:100,priority:'normal',reminder:'none',reminderDay:1,requestId:randomUUID(),...overrides});
const addUser=async()=>({userId:(await db.query("INSERT INTO users(name,email,password_hash,role) VALUES('Savings tester',$1,'test','owner') RETURNING id",[`${randomUUID()}@example.invalid`])).rows[0].id,role:'owner'});
test('savings plans reject invalid money, dates and reminder schedules',()=>{
 assert.equal(goals.definitionError(definition()),null);
 assert.ok(goals.definitionError(definition({targetAmount:0})));
 assert.ok(goals.definitionError(definition({targetAmount:1.1})));
 assert.ok(goals.definitionError(definition({deadline:'2026-02-30'})));
 assert.ok(goals.definitionError(definition({reminder:'weekly',reminderDay:8})));
});
test('goals isolate ledgers, serialize withdrawals and deduplicate contributions',{skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const users=[];let familyId;
 try {
  for(let i=0;i<3;i++)users.push(await addUser());
  const input=definition();const first=await invoke(goals.create,users[0],input);assert.equal(first.statusCode,200);
  assert.equal((await invoke(goals.create,users[0],input)).body.id,first.body.id);
  assert.equal((await invoke(goals.create,users[0],{...input,name:'Other'})).statusCode,409);
  assert.equal((await invoke(goals.list,users[1])).body.items.length,0);
  assert.equal((await invoke(goals.history,users[1],{},first.body.id)).statusCode,404);
  const dep={kind:'DEPOSIT',amount:900,note:'Góp',requestId:randomUUID()};
  const [a,b]=await Promise.all([invoke(goals.contribute,users[0],dep,first.body.id),invoke(goals.contribute,users[0],dep,first.body.id)]);
  assert.equal(a.body.goal.current_amount,'1000');assert.equal(b.body.goal.current_amount,'1000');assert.equal(a.body.goal.status,'completed');
  assert.equal((await invoke(goals.contribute,users[0],{...dep,amount:1},first.body.id)).statusCode,409);
  const withdrawals=await Promise.all([1,2].map(()=>invoke(goals.contribute,users[0],{kind:'WITHDRAW',amount:700,note:'',requestId:randomUUID()},first.body.id)));
  assert.equal(withdrawals.filter(res=>res.statusCode===200).length,1);assert.equal(withdrawals.filter(res=>res.statusCode===400).length,1);
  assert.equal((await invoke(goals.list,users[0])).body.items[0].current_amount,'300');
  assert.equal((await invoke(goals.list,users[0])).body.items[0].status,'active');
  assert.equal((await invoke(goals.history,users[0],{},first.body.id)).body.items.length,3);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM transactions WHERE user_id=$1',[users[0].userId])).rows[0].count,0);
  const created=await invoke(family.createFamily,users[0],{name:'Goal family'});familyId=created.body.family.id;
  await invoke(family.joinFamily,users[1],{inviteCode:created.body.family.invite_code});
  assert.equal((await invoke(goals.list,users[0])).body.items.length,0);
  assert.equal((await invoke(goals.contribute,users[0],dep,first.body.id)).statusCode,404);
  const shared=(await invoke(goals.create,users[0],definition())).body;
  assert.equal((await invoke(goals.list,users[1])).body.items[0].id,shared.id);
  assert.equal((await invoke(goals.contribute,users[2],dep,shared.id)).statusCode,404);
  await invoke(goals.contribute,users[1],{kind:'DEPOSIT',amount:200,note:'Thành viên góp',requestId:randomUUID()},shared.id);
  const history=(await invoke(goals.history,users[0],{},shared.id)).body.items;
  assert.equal(history[0].user_id,users[1].userId);assert.equal(history[0].actor_name,'Savings tester');
  const edit={...definition(),status:'paused'};await invoke(goals.update,users[1],edit,shared.id);
  assert.equal((await invoke(goals.contribute,users[1],{...dep,requestId:randomUUID()},shared.id)).statusCode,409);
  assert.equal((await invoke(goals.update,users[1],{...edit,status:'completed'},shared.id)).statusCode,400);
  await invoke(family.leaveFamily,users[1]);assert.equal((await invoke(goals.history,users[1],{},shared.id)).statusCode,404);
  await invoke(family.dissolveFamily,users[0]);assert.equal((await invoke(goals.list,users[0])).body.items[0].id,first.body.id);
 } finally {
  await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[users.map(user=>user.userId)]);
  if(familyId)await db.query('DELETE FROM families WHERE id=$1',[familyId]);
 }
});
test('goal reminders respect selected day, 7am, monthly clamp and completed state',{skip:process.env.RUN_DB_TESTS!=='1'},async()=>{
 const user=await addUser();
 try {
  const goal=(await invoke(goals.create,user,definition({reminder:'monthly',reminderDay:31}))).body;
  await db.query("UPDATE savings_goals SET created_at='2026-01-01T00:00:00Z' WHERE id=$1",[goal.id]);
  await generateScheduledNotifications(new Date('2026-02-27T23:59:59Z'),user.userId);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='goal_reminder'",[user.userId])).rows[0].count,0);
  await generateScheduledNotifications(new Date('2026-02-28T00:00:00Z'),user.userId);
  await generateScheduledNotifications(new Date('2026-02-28T01:00:00Z'),user.userId);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='goal_reminder'",[user.userId])).rows[0].count,1);
  await db.query("UPDATE savings_goals SET status='completed' WHERE id=$1",[goal.id]);
  await generateScheduledNotifications(new Date('2026-03-31T00:00:00Z'),user.userId);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='goal_reminder'",[user.userId])).rows[0].count,1);
  await db.query("UPDATE savings_goals SET status='active',reminder='weekly',reminder_day=5 WHERE id=$1",[goal.id]);
  await generateScheduledNotifications(new Date('2026-10-02T00:00:00Z'),user.userId);
  assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='goal_reminder'",[user.userId])).rows[0].count,2);
 } finally {await db.query('DELETE FROM users WHERE id=$1',[user.userId]);}
});
test('goal projections use confirmed savings and handle overdue and undated plans',async()=>{
 const {goalPlan}=await import('../../frontend/src/features/goals/goalPlan.mjs');
 const plan=goalPlan({target_amount:30000000,current_amount:6000000,deadline:'2027-10-02',monthly_amount:2000000},'2026-10-02');
 assert.equal(plan.progress,20);assert.equal(plan.remaining,24000000);assert.equal(plan.required,2000000);
 assert.equal(goalPlan({target_amount:1000,current_amount:100,monthly_amount:100},'2026-10-02').estimatedMonths,9);
 assert.equal(goalPlan({target_amount:1000,current_amount:100,deadline:'2026-10-01'},'2026-10-02').late,true);
 assert.equal(goalPlan({target_amount:1000,current_amount:1100},'2026-10-02').remaining,0);
});
