CREATE TABLE IF NOT EXISTS rokbot_runtime_logs (
 id BIGSERIAL PRIMARY KEY,
 agent_id UUID NOT NULL REFERENCES rokbot_agents(id) ON DELETE CASCADE,
 version VARCHAR(40) NOT NULL,message VARCHAR(1000) NOT NULL,
 client_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rokbot_runtime_logs_agent_idx ON rokbot_runtime_logs(agent_id,id DESC);
