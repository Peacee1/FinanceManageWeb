-- New, independent business module. Finance tables and retired backups are untouched.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE biz_workspaces (
 id SERIAL PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
 code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
 modules TEXT[] NOT NULL DEFAULT '{}', next_employee INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX biz_workspaces_owner ON biz_workspaces(owner_id);
CREATE TABLE biz_staff (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 user_id INTEGER NOT NULL UNIQUE REFERENCES users(id), employee_code INTEGER NOT NULL,
 level TEXT NOT NULL CHECK(level IN ('STAFF','WAREHOUSE','MANAGER','FULL')),
 UNIQUE(business_id,employee_code)
);
CREATE TABLE biz_products (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 name VARCHAR(100) NOT NULL, price BIGINT NOT NULL CHECK(price>0), image_url TEXT,
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=stock),
 archived_at TIMESTAMPTZ
);
CREATE INDEX biz_products_business ON biz_products(business_id);
CREATE TABLE biz_orders (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 actor_id INTEGER NOT NULL REFERENCES users(id), request_id UUID NOT NULL, request_hash TEXT NOT NULL,
 online BOOLEAN NOT NULL, status TEXT NOT NULL CHECK(status IN ('CONFIRMED','PACKING','SHIPPING','DELIVERED','CANCELLED','RETURNED')),
 payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH','TRANSFER','COD')),
 paid BOOLEAN NOT NULL DEFAULT false, recipient VARCHAR(100), phone VARCHAR(30), address VARCHAR(500),
 source VARCHAR(50), carrier VARCHAR(100), tracking VARCHAR(100), note VARCHAR(500),
 shipping_fee BIGINT NOT NULL DEFAULT 0 CHECK(shipping_fee>=0), discount BIGINT NOT NULL DEFAULT 0 CHECK(discount>=0),
 total BIGINT NOT NULL CHECK(total>0), inventory_enabled BOOLEAN NOT NULL,
 stock_state TEXT NOT NULL CHECK(stock_state IN ('NONE','RESERVED','EXPORTED','RETURNED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(business_id,request_id)
);
CREATE INDEX biz_orders_business ON biz_orders(business_id,id DESC);
CREATE TABLE biz_order_items (
 id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES biz_orders(id),
 product_id INTEGER NOT NULL REFERENCES biz_products(id), product_name VARCHAR(100) NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0), unit_price BIGINT NOT NULL CHECK(unit_price>0)
);
CREATE TABLE biz_ledger (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 actor_id INTEGER NOT NULL REFERENCES users(id), order_id INTEGER UNIQUE REFERENCES biz_orders(id),
 type TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE')), amount BIGINT NOT NULL CHECK(amount>0),
 description VARCHAR(500) NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 reviewed_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX biz_ledger_business ON biz_ledger(business_id,id DESC);
CREATE TABLE biz_stock_movements (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 product_id INTEGER NOT NULL REFERENCES biz_products(id), actor_id INTEGER NOT NULL REFERENCES users(id),
 type TEXT NOT NULL CHECK(type IN ('IN','OUT')), quantity INTEGER NOT NULL CHECK(quantity>0),
 reason TEXT NOT NULL, order_id INTEGER REFERENCES biz_orders(id), note VARCHAR(500),
 request_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(business_id,request_id)
);
CREATE TABLE biz_tables (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id),
 name VARCHAR(50) NOT NULL, area VARCHAR(50) NOT NULL DEFAULT '', occupied BOOLEAN NOT NULL DEFAULT false,
 surcharge BOOLEAN NOT NULL DEFAULT false, hourly_rate BIGINT NOT NULL DEFAULT 5000 CHECK(hourly_rate>0),
 billing_unit TEXT NOT NULL DEFAULT 'HOUR' CHECK(billing_unit IN ('HOUR','MINUTE')), archived_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX biz_tables_name ON biz_tables(business_id,lower(name)) WHERE archived_at IS NULL;
CREATE TABLE biz_table_sessions (
 id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES biz_workspaces(id), table_id INTEGER NOT NULL REFERENCES biz_tables(id),
 opened_by INTEGER NOT NULL REFERENCES users(id), started_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ,
 surcharge BOOLEAN NOT NULL, hourly_rate BIGINT NOT NULL, billing_unit TEXT NOT NULL,
 amount BIGINT, ledger_id INTEGER REFERENCES biz_ledger(id)
);
CREATE UNIQUE INDEX biz_table_open ON biz_table_sessions(table_id) WHERE closed_at IS NULL;

ALTER TABLE biz_workspaces ADD COLUMN link_tables BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE biz_orders ADD COLUMN table_id INTEGER REFERENCES biz_tables(id);
