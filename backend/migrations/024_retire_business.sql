-- The production database and source are backed up before applying this migration.
DROP TRIGGER IF EXISTS transactions_business_daily_totals ON transactions;
DROP TRIGGER IF EXISTS transactions_initial_approval ON transactions;
DROP TRIGGER IF EXISTS transactions_bank_initial ON transactions;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_business_id_fkey;
DROP TABLE bank_events, bank_payment_intents, bank_connections,
  cafe_occupancy_history, cafe_table_sessions, cafe_tables,
  stock_movements, sale_items, products, employees, business_daily_totals, businesses;
DELETE FROM transactions WHERE business_id IS NOT NULL;
DELETE FROM notifications WHERE kind='business_promo';
DROP FUNCTION maintain_business_daily_totals();
DROP FUNCTION initialize_transaction_approval();
DROP FUNCTION initialize_bank_payment();
DROP FUNCTION cafe_occupancy_start();
DROP FUNCTION cafe_occupancy_record();
DROP FUNCTION remember_business_created();
-- Retain the nullable discriminator for older client compatibility and existing
-- personal/family queries, while prohibiting new business records.
ALTER TABLE transactions ADD CONSTRAINT business_retired CHECK (business_id IS NULL);
