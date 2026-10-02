ALTER TABLE users ADD COLUMN has_used_family BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN has_created_business BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET has_used_family=true WHERE family_id IS NOT NULL OR id IN (SELECT user_id FROM family_dissolution_notices);
UPDATE users SET has_created_business=true WHERE id IN (SELECT owner_id FROM businesses);
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target VARCHAR(30) NOT NULL,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  UNIQUE(user_id,event_key)
);
CREATE INDEX notification_inbox ON notifications(user_id,id DESC);
CREATE INDEX notification_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE FUNCTION notify_transaction_added() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_name TEXT;
BEGIN
  IF NEW.sync_source_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT name INTO actor_name FROM users WHERE id=NEW.user_id;
  INSERT INTO notifications(user_id,kind,title,message,target,event_key)
  SELECT u.id, CASE WHEN NEW.type='INCOME' THEN 'income_added' ELSE 'expense_added' END,
    CASE WHEN NEW.type='INCOME' THEN 'Đã thêm khoản thu' ELSE 'Đã thêm khoản chi' END,
    CASE WHEN u.id=NEW.user_id THEN 'Bạn' ELSE actor_name END || ' đã ghi ' ||
    to_char(NEW.amount,'FM999,999,999,999,999,999,999') || ' ₫ · ' || NEW.category ||
    CASE WHEN NEW.approval_status='PENDING' THEN ' (chờ duyệt).' ELSE '.' END,
    CASE WHEN NEW.business_id IS NOT NULL THEN 'business' ELSE 'transactions' END,
    'transaction:' || NEW.id
  FROM users u WHERE u.id=NEW.user_id OR (NEW.family_id IS NOT NULL AND u.family_id=NEW.family_id)
  ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transaction_notification AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION notify_transaction_added();
CREATE FUNCTION notify_family_joined() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE family_name TEXT; creator INTEGER;
BEGIN
  IF NEW.family_id IS NULL OR NEW.family_id IS NOT DISTINCT FROM OLD.family_id THEN RETURN NEW; END IF;
  SELECT name,creator_id INTO family_name,creator FROM families WHERE id=NEW.family_id;
  NEW.has_used_family := true;
  INSERT INTO notifications(user_id,kind,title,message,target,event_key)
  SELECT u.id,'family_joined',
    CASE WHEN u.id=NEW.id THEN CASE WHEN NEW.id=creator THEN 'Đã tạo Gia đình' ELSE 'Đã tham gia Gia đình' END ELSE 'Gia đình có thành viên mới' END,
    CASE WHEN u.id=NEW.id THEN 'Bạn đã tham gia Gia đình “' || family_name || '”.' ELSE NEW.name || ' vừa tham gia Gia đình “' || family_name || '”.' END,
    'family','family-join:' || NEW.family_id || ':' || NEW.id || ':' || gen_random_uuid()::text
  FROM users u WHERE u.id=NEW.id OR u.family_id=NEW.family_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER family_join_notification BEFORE UPDATE OF family_id ON users FOR EACH ROW EXECUTE FUNCTION notify_family_joined();
CREATE FUNCTION remember_business_created() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET has_created_business=true WHERE id=NEW.owner_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER business_created_history AFTER INSERT ON businesses FOR EACH ROW EXECUTE FUNCTION remember_business_created();
