ALTER TABLE businesses ADD COLUMN auto_approve_transactions BOOLEAN NOT NULL DEFAULT false;
-- Existing transactions remain approved, including all historical employee entries.
ALTER TABLE transactions ADD COLUMN approval_status VARCHAR(10) NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE transactions ADD COLUMN reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN evidence_filename TEXT;
ALTER TABLE transactions ADD COLUMN evidence_mime VARCHAR(20);
ALTER TABLE transactions ADD COLUMN evidence_expires_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN submission_request_id UUID;
ALTER TABLE transactions ADD COLUMN submission_request_hash TEXT;
CREATE UNIQUE INDEX transactions_submission_request ON transactions(user_id,submission_request_id) WHERE submission_request_id IS NOT NULL;
CREATE INDEX transactions_approval_page ON transactions(business_id,approval_status,id DESC) WHERE business_id IS NOT NULL;
CREATE INDEX transactions_expiring_evidence ON transactions(evidence_expires_at,id) WHERE evidence_filename IS NOT NULL;
CREATE UNIQUE INDEX transactions_evidence_filename ON transactions(evidence_filename) WHERE evidence_filename IS NOT NULL;
CREATE TABLE transaction_evidence_files (
  filename TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now()+interval '1 month')
);
CREATE INDEX transaction_evidence_expiry ON transaction_evidence_files(expires_at,filename);

CREATE FUNCTION initialize_transaction_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_id IS NOT NULL AND EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND role='employee') THEN
    IF (SELECT auto_approve_transactions FROM businesses WHERE id=NEW.business_id) THEN
      NEW.approval_status := 'APPROVED'; NEW.reviewed_at := now();
    ELSE
      NEW.approval_status := 'PENDING'; NEW.reviewed_at := NULL;
    END IF;
    NEW.reviewed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transactions_initial_approval BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION initialize_transaction_approval();

CREATE OR REPLACE FUNCTION maintain_business_daily_totals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND ROW(OLD.business_id,OLD.user_id,OLD.date,OLD.type,OLD.amount,OLD.approval_status)
    IS NOT DISTINCT FROM ROW(NEW.business_id,NEW.user_id,NEW.date,NEW.type,NEW.amount,NEW.approval_status) THEN
    RETURN NULL;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.business_id IS NOT NULL AND OLD.approval_status='APPROVED' THEN
    INSERT INTO business_daily_totals(business_id,user_id,date,income,expense)
    VALUES (OLD.business_id,OLD.user_id,OLD.date,CASE WHEN OLD.type='INCOME' THEN -OLD.amount ELSE 0 END,CASE WHEN OLD.type='EXPENSE' THEN -OLD.amount ELSE 0 END)
    ON CONFLICT (business_id,user_id,date) DO UPDATE SET income=business_daily_totals.income+EXCLUDED.income,expense=business_daily_totals.expense+EXCLUDED.expense;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.business_id IS NOT NULL AND NEW.approval_status='APPROVED' THEN
    INSERT INTO business_daily_totals(business_id,user_id,date,income,expense)
    VALUES (NEW.business_id,NEW.user_id,NEW.date,CASE WHEN NEW.type='INCOME' THEN NEW.amount ELSE 0 END,CASE WHEN NEW.type='EXPENSE' THEN NEW.amount ELSE 0 END)
    ON CONFLICT (business_id,user_id,date) DO UPDATE SET income=business_daily_totals.income+EXCLUDED.income,expense=business_daily_totals.expense+EXCLUDED.expense;
  END IF;
  RETURN NULL;
END;
$$;
