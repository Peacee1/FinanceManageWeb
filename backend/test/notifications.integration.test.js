const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../config/db');
const { generateScheduledNotifications } = require('../services/notificationService');
const { listNotifications, markRead } = require('../controllers/notificationController');
const { addTransaction } = require('../controllers/transactionController');
const { chatTransaction } = require('../controllers/chatController');
const { createFamily, joinFamily, dissolveFamily } = require('../controllers/familyController');
after(() => db.close());
const invoke = async (handler,user,body={},query={}) => {
  const res={statusCode:200,status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;},setHeader(){}};
  await handler({user,body,query},res,error=>{throw error;});return res;
};
test('notifications isolate readers, deduplicate writes and name family actors', {skip:process.env.RUN_DB_TESTS!=='1'}, async()=>{
  const users=[];let familyId;
  try {
    for(let i=0;i<3;i++) users.push({userId:(await db.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,'test','owner') RETURNING id",['Notice '+i,`${randomUUID()}@example.invalid`])).rows[0].id,role:'owner'});
    const created=await invoke(createFamily,users[0],{name:'Notification family'});familyId=created.body.family.id;
    await invoke(joinFamily,users[1],{inviteCode:created.body.family.invite_code});
    let rows=(await db.query("SELECT * FROM notifications WHERE user_id=$1 AND kind='family_joined'",[users[0].userId])).rows;
    assert.ok(rows.some(row=>row.message.includes('Notice 1')));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind='family_joined'",[users[1].userId])).rows[0].count,1);
    const added=await invoke(addTransaction,users[0],{type:'EXPENSE',amount:123,category:'Ăn uống',date:'2026-10-02'});
    assert.equal((await db.query('SELECT count(*)::int AS count FROM notifications WHERE event_key=$1',[`transaction:${added.body.id}`])).rows[0].count,2);
    const chatBody={message:'thu lương 200k',requestId:randomUUID()};
    const first=await invoke(chatTransaction,users[1],chatBody); const replay=await invoke(chatTransaction,users[1],chatBody);
    assert.equal(replay.body.replayed,true);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM notifications WHERE event_key=$1',[`transaction:${first.body.transaction.id}`])).rows[0].count,2);
    await invoke(dissolveFamily,users[0]);
    rows=(await db.query("SELECT * FROM notifications WHERE kind='family_dissolved' AND user_id=ANY($1::int[])",[users.map(user=>user.userId)])).rows;
    assert.equal(rows.length,2); assert.ok(rows.every(row=>row.message.includes('Notice 0')));
    assert.equal((await invoke(markRead,users[2],{id:String(rows[0].id)})).statusCode,404);
    await invoke(markRead,users[0],{all:true});
    assert.ok((await db.query('SELECT * FROM notifications WHERE user_id=$1',[users[0].userId])).rows.every(row=>row.read_at));
    const inbox=await invoke(listNotifications,users[1]);
    assert.ok(inbox.body.unread>0);assert.ok(inbox.body.items.some(row=>row.kind==='family_dissolved'));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind IN ('income_added','expense_added','family_dissolved','family_joined')",[users[2].userId])).rows[0].count,0);
  } finally { await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[users.map(user=>user.userId)]);if(familyId) await db.query('DELETE FROM families WHERE id=$1',[familyId]); }
});
test('daily reminders start at UTC midnight; promos respect exact age and historical usage', {skip:process.env.RUN_DB_TESTS!=='1'}, async()=>{
  const ids=[];
  const make=async(created,role='owner')=>{const id=(await db.query("INSERT INTO users(name,email,password_hash,role,created_at) VALUES('Schedule test',$1,'test',$2,$3) RETURNING id",[`${randomUUID()}@example.invalid`,role,created])).rows[0].id;ids.push(id);return id;};
  const count=async(id,kind)=>(await db.query('SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND kind=$2',[id,kind])).rows[0].count;
  const at=async(date,id)=>generateScheduledNotifications(new Date(date),id);
  try {
    const fresh=await make('2026-10-01 00:00:00');
    await at('2026-10-03T23:59:59Z',fresh);assert.equal(await count(fresh,'family_promo'),0);
    await Promise.all([1,2].map(()=>at('2026-10-04T00:00:00Z',fresh)));assert.equal(await count(fresh,'family_promo'),1);
    const reminders=(await db.query("SELECT * FROM notifications WHERE user_id=$1 AND kind='checkin_reminder' ORDER BY created_at",[fresh])).rows;
    assert.equal(reminders.length,2);assert.equal(new Date(reminders[1].created_at).toISOString(),'2026-10-04T00:00:00.000Z');
    await db.query("UPDATE users SET last_checkin_date='2026-10-05' WHERE id=$1",[fresh]);
    await at('2026-10-05T00:00:00Z',fresh);assert.equal(await count(fresh,'checkin_reminder'),2);
    const month=await make('2026-01-31 08:00:00');
    await at('2026-02-28T07:59:59Z',month);assert.equal(await count(month,'business_promo'),0);
    await at('2026-02-28T08:00:00Z',month);assert.equal(await count(month,'business_promo'),1);
    const used=await make('2025-01-01 00:00:00');
    await db.query('UPDATE users SET has_used_family=true,has_created_business=true WHERE id=$1',[used]);
    await at('2026-10-04T00:00:00Z',used);assert.equal(await count(used,'family_promo'),0);assert.equal(await count(used,'business_promo'),0);
    const employee=await make('2025-01-01 00:00:00','employee');await at('2026-10-04T00:00:00Z',employee);assert.equal(await count(employee,'checkin_reminder'),0);
  } finally {await db.query('DELETE FROM users WHERE id=ANY($1::int[])',[ids]);}
});
