-- Only repair employee POS dates that exactly match the old UTC-day behavior.
-- created_at is a timestamp without time zone, recorded in UTC on this server.
UPDATE transactions t
SET date = (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
FROM users u
WHERE t.user_id = u.id AND u.role = 'employee'
  AND t.business_id IS NOT NULL AND t.type = 'INCOME'
  AND t.date = t.created_at::date
  AND t.date <> (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
