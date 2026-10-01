ALTER TABLE cafe_tables ADD COLUMN surcharge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cafe_tables ADD COLUMN hourly_rate BIGINT NOT NULL DEFAULT 5000 CHECK (hourly_rate BETWEEN 1 AND 1000000000);
ALTER TABLE cafe_tables ADD COLUMN billing_unit VARCHAR(10) NOT NULL DEFAULT 'HOUR' CHECK (billing_unit IN ('MINUTE','HOUR'));
ALTER TABLE cafe_tables ADD COLUMN deleted_at TIMESTAMPTZ;
DROP INDEX cafe_tables_business_name;
CREATE UNIQUE INDEX cafe_tables_business_name ON cafe_tables(business_id, lower(name)) WHERE deleted_at IS NULL;
CREATE TABLE cafe_table_sessions (
  id UUID PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_name VARCHAR(50) NOT NULL,
  hourly_rate BIGINT NOT NULL CHECK (hourly_rate BETWEEN 1 AND 1000000000),
  billing_unit VARCHAR(10) NOT NULL CHECK (billing_unit IN ('MINUTE','HOUR')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  closed_at TIMESTAMPTZ,
  quote_token UUID,
  quoted_at TIMESTAMPTZ,
  quote_amount BIGINT CHECK (quote_amount > 0),
  billed_units INTEGER CHECK (billed_units > 0),
  paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('CASH','TRANSFER')),
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX cafe_table_sessions_open ON cafe_table_sessions(table_id) WHERE closed_at IS NULL;
ALTER TABLE cafe_tables ADD COLUMN current_session_id UUID REFERENCES cafe_table_sessions(id) ON DELETE SET NULL;
