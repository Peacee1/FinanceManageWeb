ALTER TABLE users ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone_unique ON users(phone) WHERE phone_verified_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS account_challenges (
 id UUID PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('email','phone','reset')),
 target TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '10 minutes',
 attempts INTEGER NOT NULL DEFAULT 0,
 delivered BOOLEAN NOT NULL DEFAULT false,
 consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS account_challenges_lookup ON account_challenges(user_id,purpose,created_at DESC);
