CREATE TABLE IF NOT EXISTS board_rooms (
 id UUID PRIMARY KEY,
 code VARCHAR(6) UNIQUE NOT NULL,
 state JSONB NOT NULL,
 deadline TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS board_due_rooms ON board_rooms(deadline) WHERE deadline IS NOT NULL;
CREATE TABLE IF NOT EXISTS board_signals (
 id BIGSERIAL PRIMARY KEY,
 room_id UUID NOT NULL REFERENCES board_rooms(id) ON DELETE CASCADE,
 sender INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 phase_id INTEGER NOT NULL,
 payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS board_signal_recipient ON board_signals(room_id,recipient,id);
CREATE INDEX IF NOT EXISTS board_signal_expiry ON board_signals(created_at);
