CREATE TABLE beatmaker_projects (
 id BIGSERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project JSONB NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX beatmaker_projects_owner_idx ON beatmaker_projects(user_id,updated_at DESC);
INSERT INTO beatmaker_projects(user_id,project,revision,updated_at)
 SELECT user_id,project,revision,updated_at FROM beat_projects;
