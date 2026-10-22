CREATE TABLE rokbot_profiles (
 id BIGSERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name VARCHAR(80) NOT NULL,
 config JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rokbot_profiles_owner_idx ON rokbot_profiles(user_id,updated_at DESC);
