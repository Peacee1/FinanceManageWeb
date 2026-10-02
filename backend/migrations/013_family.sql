CREATE TABLE families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(64) UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN family_id INTEGER REFERENCES families(id);
ALTER TABLE users ADD COLUMN family_slot SMALLINT;
ALTER TABLE users ADD CONSTRAINT family_membership CHECK (
  (family_id IS NULL AND family_slot IS NULL) OR
  (family_id IS NOT NULL AND family_slot IS NOT NULL AND family_slot IN (1,2) AND role = 'owner')
);
CREATE UNIQUE INDEX family_two_members ON users(family_id, family_slot);
ALTER TABLE transactions ADD COLUMN family_id INTEGER REFERENCES families(id);
ALTER TABLE transactions ADD CONSTRAINT separate_family_business CHECK (family_id IS NULL OR business_id IS NULL);
CREATE INDEX family_calendar ON transactions(family_id, date DESC, id DESC) WHERE family_id IS NOT NULL;
-- Serialize membership changes with new writes, including chat writes.
CREATE FUNCTION assign_transaction_family() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    SELECT family_id INTO NEW.family_id FROM users WHERE id = NEW.user_id FOR SHARE;
  ELSE
    NEW.family_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transaction_family BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION assign_transaction_family();
