CREATE TABLE bank_connections (
  id UUID PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  bank_code VARCHAR(20) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  secret_ciphertext TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);
CREATE UNIQUE INDEX bank_connections_active_account ON bank_connections(bank_code,account_number) WHERE enabled;
ALTER TABLE transactions ADD COLUMN bank_payment_status VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (bank_payment_status IN ('MANUAL','WAITING','VERIFIED','EXCEPTION'));
ALTER TABLE transactions ADD COLUMN bank_verified_at TIMESTAMPTZ;
CREATE TABLE bank_payment_intents (
  id UUID PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE RESTRICT,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES cafe_table_sessions(id) ON DELETE SET NULL,
  table_id INTEGER REFERENCES cafe_tables(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount>0),
  bank_code VARCHAR(20) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','PAID','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp()+interval '15 minutes'),
  paid_at TIMESTAMPTZ
);
CREATE INDEX bank_intents_business_page ON bank_payment_intents(business_id,id);
CREATE INDEX bank_intents_open_connection ON bank_payment_intents(connection_id) WHERE status='WAITING';
CREATE TABLE bank_events (
  id BIGSERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE RESTRICT,
  provider_id BIGINT NOT NULL,
  payload_hash TEXT NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('in','out')),
  amount BIGINT NOT NULL CHECK (amount>0),
  content VARCHAR(1000) NOT NULL,
  reference_code VARCHAR(160) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  status VARCHAR(30) NOT NULL,
  intent_id UUID REFERENCES bank_payment_intents(id) ON DELETE RESTRICT,
  reconciled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(connection_id,provider_id)
);
CREATE INDEX bank_events_business_page ON bank_events(business_id,id DESC);
CREATE FUNCTION initialize_bank_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.bank_payment_status:='MANUAL'; NEW.bank_verified_at:=NULL;
  IF NEW.business_id IS NOT NULL AND NEW.type='INCOME' AND NEW.payment_method='TRANSFER'
    AND EXISTS(SELECT 1 FROM bank_connections WHERE business_id=NEW.business_id AND enabled) THEN
    NEW.bank_payment_status:='WAITING';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transactions_bank_initial BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION initialize_bank_payment();
CREATE OR REPLACE FUNCTION maintain_business_daily_totals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND ROW(OLD.business_id,OLD.user_id,OLD.date,OLD.type,OLD.amount,OLD.approval_status,OLD.bank_payment_status)
    IS NOT DISTINCT FROM ROW(NEW.business_id,NEW.user_id,NEW.date,NEW.type,NEW.amount,NEW.approval_status,NEW.bank_payment_status) THEN RETURN NULL; END IF;
  IF TG_OP<>'INSERT' AND OLD.business_id IS NOT NULL AND OLD.approval_status='APPROVED' AND OLD.bank_payment_status IN ('MANUAL','VERIFIED') THEN
    INSERT INTO business_daily_totals(business_id,user_id,date,income,expense)
    VALUES (OLD.business_id,OLD.user_id,OLD.date,CASE WHEN OLD.type='INCOME' THEN -OLD.amount ELSE 0 END,CASE WHEN OLD.type='EXPENSE' THEN -OLD.amount ELSE 0 END)
    ON CONFLICT (business_id,user_id,date) DO UPDATE SET income=business_daily_totals.income+EXCLUDED.income,expense=business_daily_totals.expense+EXCLUDED.expense;
  END IF;
  IF TG_OP<>'DELETE' AND NEW.business_id IS NOT NULL AND NEW.approval_status='APPROVED' AND NEW.bank_payment_status IN ('MANUAL','VERIFIED') THEN
    INSERT INTO business_daily_totals(business_id,user_id,date,income,expense)
    VALUES (NEW.business_id,NEW.user_id,NEW.date,CASE WHEN NEW.type='INCOME' THEN NEW.amount ELSE 0 END,CASE WHEN NEW.type='EXPENSE' THEN NEW.amount ELSE 0 END)
    ON CONFLICT (business_id,user_id,date) DO UPDATE SET income=business_daily_totals.income+EXCLUDED.income,expense=business_daily_totals.expense+EXCLUDED.expense;
  END IF;
  RETURN NULL;
END;
$$;
