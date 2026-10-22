CREATE TABLE rokbot_accounts (
 id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 email VARCHAR(254) NOT NULL, method VARCHAR(16) NOT NULL CHECK(method IN ('code','password')),
 secret TEXT, governors JSONB NOT NULL DEFAULT '[]', config JSONB NOT NULL,
 status VARCHAR(40) NOT NULL DEFAULT 'pending_login', updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,email)
);
CREATE TABLE rokbot_agents (
 id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name VARCHAR(80) NOT NULL, token_hash VARCHAR(64) NOT NULL, ip TEXT, version VARCHAR(40),
 last_seen TIMESTAMPTZ, desired VARCHAR(10) NOT NULL DEFAULT 'stop' CHECK(desired IN ('run','stop')),
 status VARCHAR(40) NOT NULL DEFAULT 'offline'
);
CREATE TABLE rokbot_assignments (
 account_id BIGINT PRIMARY KEY REFERENCES rokbot_accounts(id) ON DELETE CASCADE,
 agent_id UUID NOT NULL REFERENCES rokbot_agents(id) ON DELETE CASCADE,
 lease_id UUID NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE rokbot_events (
 id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 agent_id UUID REFERENCES rokbot_agents(id) ON DELETE SET NULL, account_id BIGINT REFERENCES rokbot_accounts(id) ON DELETE SET NULL,
 message VARCHAR(500) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rokbot_events_owner_idx ON rokbot_events(user_id,id DESC);
