CREATE TABLE IF NOT EXISTS rokbot_capture (
 agent_id UUID PRIMARY KEY REFERENCES rokbot_agents(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,completed_id UUID,requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 completed_at TIMESTAMPTZ,screenshot TEXT,message VARCHAR(500) NOT NULL DEFAULT ''
);
