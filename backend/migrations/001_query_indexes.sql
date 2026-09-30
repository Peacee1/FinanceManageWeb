CREATE INDEX IF NOT EXISTS transactions_user_date_id_idx ON transactions(user_id, date DESC, id DESC);
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS employees_user_idx ON employees(user_id);
CREATE INDEX IF NOT EXISTS products_business_name_idx ON products(business_id, name);
