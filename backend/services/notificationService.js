const db = require('../config/db');
async function generateScheduledNotifications(at = new Date(), userId = null) {
  const params = [at.toISOString(), userId];
  await db.transaction(async client => {
    // Current UTC day only: offline users get today's reminder, not a backlog.
    await client.query(`INSERT INTO notifications(user_id,kind,title,message,target,event_key,created_at)
      SELECT id,'checkin_reminder','Đến giờ điểm danh!','Điểm danh hôm nay để nhận xu và duy trì chuỗi ngày của bạn.','checkin',
        'checkin:' || ($1::timestamptz AT TIME ZONE 'UTC')::date,
        date_trunc('day',$1::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
      FROM users WHERE role='owner' AND is_active IS DISTINCT FROM false AND ($2::int IS NULL OR id=$2)
      AND created_at <= ($1::timestamptz AT TIME ZONE 'UTC')
      AND (last_checkin_date IS NULL OR last_checkin_date < ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
      ON CONFLICT(user_id,event_key) DO NOTHING`, params);
    await client.query(`INSERT INTO notifications(user_id,kind,title,message,target,event_key,created_at)
      SELECT id,'family_promo','Cùng người thân quản lý thu chi','Khám phá Gia đình: dùng chung lịch, thu chi và mục tiêu với người thân.','family','promo:family',
        (created_at AT TIME ZONE 'UTC') + interval '3 days'
      FROM users WHERE role='owner' AND is_active IS DISTINCT FROM false AND ($2::int IS NULL OR id=$2)
      AND NOT has_used_family AND family_id IS NULL AND (created_at AT TIME ZONE 'UTC') + interval '3 days' <= $1::timestamptz
      ON CONFLICT(user_id,event_key) DO NOTHING`, params);
    await client.query(`WITH clock AS (SELECT $1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' AS local)
      INSERT INTO notifications(user_id,kind,title,message,target,event_key,created_at)
      SELECT u.id,'goal_reminder','Đến lịch góp cho mục tiêu',
        'Hôm nay là lịch góp cho “' || g.name || '”. Mở mục tiêu để cập nhật số tiền đã dành.',
        'goals','goal-reminder:' || g.id || ':' || clock.local::date,$1::timestamptz
      FROM savings_goals g JOIN users u ON (g.family_id IS NOT NULL AND u.family_id=g.family_id) OR (g.family_id IS NULL AND u.id=g.owner_id AND u.family_id IS NULL)
      CROSS JOIN clock
      WHERE g.status='active' AND g.reminder<>'none' AND u.role='owner' AND u.is_active IS DISTINCT FROM false
      AND ($2::int IS NULL OR u.id=$2) AND clock.local::time >= time '07:00'
      AND (g.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < clock.local::date
      AND ((g.reminder='weekly' AND extract(isodow FROM clock.local)=g.reminder_day)
        OR (g.reminder='monthly' AND extract(day FROM clock.local)=least(g.reminder_day,extract(day FROM date_trunc('month',clock.local)+interval '1 month - 1 day')::int)))
      AND NOT EXISTS(SELECT 1 FROM savings_goal_entries e WHERE e.goal_id=g.id AND e.kind='DEPOSIT' AND (e.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=clock.local::date)
      ON CONFLICT(user_id,event_key) DO NOTHING`,params);
  });
}
function startNotificationScheduler() {
  let timer, stopped = false;
  const tick = async () => {
    try { await generateScheduledNotifications(); } catch (error) { console.error('Notification scheduling failed', { code: error.code }); }
    if (!stopped) timer = setTimeout(tick, 60000 - Date.now() % 60000).unref();
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
module.exports = { generateScheduledNotifications, startNotificationScheduler };
