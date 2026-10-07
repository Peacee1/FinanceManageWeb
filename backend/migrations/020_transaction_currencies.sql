ALTER TABLE users ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'VND' CHECK(currency IN ('VND','USD','CNY','JPY','KRW','RUB'));
-- Existing amounts retain VND. New decimal currencies store exact minor units in the integer amount column.
ALTER TABLE transactions ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'VND' CHECK(currency IN ('VND','USD','CNY','JPY','KRW','RUB'));
ALTER TABLE transactions ADD CONSTRAINT business_currency_vnd CHECK(business_id IS NULL OR currency='VND');
CREATE FUNCTION keep_transaction_currency() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.currency IS DISTINCT FROM OLD.currency THEN RAISE EXCEPTION 'Transaction currency cannot be changed'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER transaction_currency_immutable BEFORE UPDATE OF currency ON transactions FOR EACH ROW EXECUTE FUNCTION keep_transaction_currency();
CREATE OR REPLACE FUNCTION notify_transaction_added() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_name TEXT; display_amount NUMERIC;
BEGIN
 IF NEW.sync_source_id IS NOT NULL THEN RETURN NEW; END IF;
 SELECT name INTO actor_name FROM users WHERE id=NEW.user_id;
 display_amount:=NEW.amount::numeric / CASE WHEN NEW.currency IN ('USD','CNY','RUB') THEN 100 ELSE 1 END;
 INSERT INTO notifications(user_id,kind,title,message,target,event_key)
 SELECT u.id,CASE WHEN NEW.type='INCOME' THEN 'income_added' ELSE 'expense_added' END,
 CASE WHEN NEW.type='INCOME' THEN 'Đã thêm khoản thu' ELSE 'Đã thêm khoản chi' END,
 CASE WHEN u.id=NEW.user_id THEN 'Bạn' ELSE actor_name END || ' đã ghi ' || display_amount::text || ' ' || NEW.currency || ' · ' || NEW.category || CASE WHEN NEW.approval_status='PENDING' THEN ' (chờ duyệt).' ELSE '.' END,
 CASE WHEN NEW.business_id IS NOT NULL THEN 'business' ELSE 'transactions' END,'transaction:' || NEW.id
 FROM users u WHERE u.id=NEW.user_id OR (NEW.family_id IS NOT NULL AND u.family_id=NEW.family_id)
 ON CONFLICT(user_id,event_key) DO NOTHING;
 RETURN NEW;
END;
$$;
