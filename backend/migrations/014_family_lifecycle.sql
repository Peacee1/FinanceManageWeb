ALTER TABLE families ADD COLUMN dissolved_at TIMESTAMPTZ;
ALTER TABLE families ADD COLUMN creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE families f SET creator_id=u.id FROM users u WHERE u.family_id=f.id AND u.family_slot=1;
ALTER TABLE families ADD COLUMN member_capacity INTEGER NOT NULL DEFAULT 2 CHECK (member_capacity >= 2);
ALTER TABLE users DROP CONSTRAINT family_membership;
ALTER TABLE users ADD CONSTRAINT family_membership CHECK (
  (family_id IS NULL AND family_slot IS NULL) OR
  (family_id IS NOT NULL AND family_slot IS NOT NULL AND family_slot > 0 AND role = 'owner')
);
ALTER TABLE transactions ADD COLUMN sync_source_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
CREATE TABLE family_dissolution_notices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id INTEGER NOT NULL REFERENCES families(id),
  resolved_at TIMESTAMPTZ,
  sync_data BOOLEAN,
  event_type VARCHAR(10) NOT NULL DEFAULT 'dissolved' CHECK (event_type IN ('dissolved','left')),
  UNIQUE(user_id,family_id)
);
CREATE TABLE family_slot_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id INTEGER NOT NULL REFERENCES families(id),
  request_id UUID NOT NULL,
  price INTEGER NOT NULL DEFAULT 1500 CHECK (price=1500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_id)
);
