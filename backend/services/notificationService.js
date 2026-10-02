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
    await client.query(`INSERT INTO notifications(user_id,kind,title,message,target,event_key,created_at)
      SELECT id,'business_promo','Khám phá chế độ Doanh nghiệp','Quản lý bán hàng, nhân viên và thu chi cửa hàng ngay trên Peacee1.','business','promo:business',
        ((created_at + interval '1 month') AT TIME ZONE 'UTC')
      FROM users WHERE role='owner' AND is_active IS DISTINCT FROM false AND ($2::int IS NULL OR id=$2)
      AND NOT has_created_business AND NOT EXISTS(SELECT 1 FROM businesses b WHERE b.owner_id=users.id)
      AND ((created_at + interval '1 month') AT TIME ZONE 'UTC') <= $1::timestamptz
      ON CONFLICT(user_id,event_key) DO NOTHING`, params);
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
