CREATE TABLE cafe_tables (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL CHECK (length(trim(name)) > 0),
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cafe_tables_business_name ON cafe_tables(business_id, lower(name));
