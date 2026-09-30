-- This initial backfill runs against the small existing database under a write lock.
LOCK TABLE transactions IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE business_daily_totals (
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  income NUMERIC(24,0) NOT NULL DEFAULT 0,
  expense NUMERIC(24,0) NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, user_id, date)
);
CREATE INDEX business_daily_totals_period_idx ON business_daily_totals(business_id, date);
INSERT INTO business_daily_totals(business_id, user_id, date, income, expense)
SELECT business_id, user_id, date,
  COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0),
  COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)
FROM transactions WHERE business_id IS NOT NULL GROUP BY business_id, user_id, date;

CREATE FUNCTION maintain_business_daily_totals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.business_id IS NOT NULL THEN
    INSERT INTO business_daily_totals(business_id, user_id, date, income, expense)
    VALUES (OLD.business_id, OLD.user_id, OLD.date,
      CASE WHEN OLD.type = 'INCOME' THEN -OLD.amount ELSE 0 END,
      CASE WHEN OLD.type = 'EXPENSE' THEN -OLD.amount ELSE 0 END)
    ON CONFLICT (business_id, user_id, date) DO UPDATE
    SET income = business_daily_totals.income + EXCLUDED.income,
        expense = business_daily_totals.expense + EXCLUDED.expense;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.business_id IS NOT NULL THEN
    INSERT INTO business_daily_totals(business_id, user_id, date, income, expense)
    VALUES (NEW.business_id, NEW.user_id, NEW.date,
      CASE WHEN NEW.type = 'INCOME' THEN NEW.amount ELSE 0 END,
      CASE WHEN NEW.type = 'EXPENSE' THEN NEW.amount ELSE 0 END)
    ON CONFLICT (business_id, user_id, date) DO UPDATE
    SET income = business_daily_totals.income + EXCLUDED.income,
        expense = business_daily_totals.expense + EXCLUDED.expense;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER transactions_business_daily_totals
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION maintain_business_daily_totals();
