ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE RESTRICT;
-- Existing employee transactions originated from the employee POS flow.
UPDATE transactions t SET business_id = e.business_id
FROM employees e WHERE t.user_id = e.user_id AND t.business_id IS NULL;
CREATE INDEX IF NOT EXISTS transactions_business_date_id_idx ON transactions(business_id, date DESC, id DESC) WHERE business_id IS NOT NULL;
