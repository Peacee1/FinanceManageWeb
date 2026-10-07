ALTER TABLE transactions ADD COLUMN actor_name TEXT;
UPDATE transactions t SET actor_name=u.name FROM users u WHERE u.id=t.user_id;
CREATE FUNCTION snapshot_transaction_actor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.actor_name IS NULL THEN
   SELECT name INTO NEW.actor_name FROM users WHERE id=NEW.user_id;
  END IF;
 ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
  SELECT name INTO NEW.actor_name FROM users WHERE id=NEW.user_id;
 ELSE
  NEW.actor_name := OLD.actor_name;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER transaction_actor BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION snapshot_transaction_actor();
