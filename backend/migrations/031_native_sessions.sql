CREATE TABLE native_sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_version INTEGER NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  previous_hash CHAR(64),
  previous_valid_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX native_session_previous ON native_sessions(previous_hash) WHERE previous_hash IS NOT NULL;
CREATE INDEX native_session_user ON native_sessions(user_id);
