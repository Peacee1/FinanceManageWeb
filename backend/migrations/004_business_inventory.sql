ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0);
ALTER TABLE products ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ALTER COLUMN track_stock SET DEFAULT true;
ALTER TABLE products ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'TRANSFER'));
ALTER TABLE transactions ADD COLUMN sale_request_id UUID;
ALTER TABLE transactions ADD COLUMN sale_request_hash TEXT;
CREATE UNIQUE INDEX transactions_sale_request_idx ON transactions(business_id, sale_request_id) WHERE sale_request_id IS NOT NULL;
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(100) NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  type VARCHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('RECEIPT', 'MANUAL', 'SALE')),
  note VARCHAR(500) NOT NULL DEFAULT '',
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE RESTRICT,
  movement_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  request_id UUID,
  request_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_business_time_idx ON stock_movements(business_id, created_at DESC, id DESC);
CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price > 0)
);
CREATE INDEX sale_items_transaction_idx ON sale_items(transaction_id);

ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE businesses ADD COLUMN next_employee_code INTEGER NOT NULL DEFAULT 1;
UPDATE businesses b SET next_employee_code = COALESCE((SELECT MAX(e.employee_code) + 1 FROM employees e WHERE e.business_id = b.id), 1);
CREATE INDEX stock_movements_active_product_idx ON stock_movements(product_id, movement_date, id) WHERE deleted_at IS NULL;

CREATE INDEX stock_movements_active_business_page_idx ON stock_movements(business_id, movement_date DESC, id DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX stock_movements_request_idx ON stock_movements(business_id, request_id) WHERE request_id IS NOT NULL;
