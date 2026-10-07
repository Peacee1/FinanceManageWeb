CREATE FUNCTION format_notification_amount(amount NUMERIC, currency TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE WHEN currency IN ('USD','CNY','RUB')
    THEN to_char(amount / 100, 'FM999,999,999,999,999,999,990.00') || ' ' || currency
    ELSE replace(to_char(amount, 'FM999,999,999,999,999,999,990'), ',', '.') ||
      CASE WHEN currency='VND' THEN ' ₫' ELSE ' ' || currency END
  END;
$$;

CREATE OR REPLACE FUNCTION notify_transaction_added() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_name TEXT;
BEGIN
 IF NEW.sync_source_id IS NOT NULL THEN RETURN NEW; END IF;
 SELECT name INTO actor_name FROM users WHERE id=NEW.user_id;
 INSERT INTO notifications(user_id,kind,title,message,target,event_key)
 SELECT u.id,CASE WHEN NEW.type='INCOME' THEN 'income_added' ELSE 'expense_added' END,
 CASE WHEN NEW.type='INCOME' THEN 'Đã thêm khoản thu' ELSE 'Đã thêm khoản chi' END,
 CASE WHEN u.id=NEW.user_id THEN 'Bạn' ELSE actor_name END || ' đã ghi ' ||
 format_notification_amount(NEW.amount::numeric,NEW.currency) || ' · ' || NEW.category ||
 CASE WHEN NEW.approval_status='PENDING' THEN ' (chờ duyệt).' ELSE '.' END,
 CASE WHEN NEW.business_id IS NOT NULL THEN 'business' ELSE 'transactions' END,'transaction:' || NEW.id
 FROM users u WHERE u.id=NEW.user_id OR (NEW.family_id IS NOT NULL AND u.family_id=NEW.family_id)
 ON CONFLICT(user_id,event_key) DO NOTHING;
 RETURN NEW;
END;
$$;

-- Repair the amount captured at notification creation, without replacing it
-- with a transaction amount that may have been edited since then.
WITH old AS (
  SELECT id, regexp_match(message, '^(.* đã ghi )([0-9]+(?:\.[0-9]+)?) (VND|USD|CNY|JPY|KRW|RUB)( · .*)$') AS parts
  FROM notifications WHERE kind IN ('income_added','expense_added')
)
UPDATE notifications n SET message=old.parts[1] ||
  format_notification_amount(old.parts[2]::numeric * CASE WHEN old.parts[3] IN ('USD','CNY','RUB') THEN 100 ELSE 1 END,old.parts[3]) || old.parts[4]
FROM old WHERE n.id=old.id AND old.parts IS NOT NULL;
