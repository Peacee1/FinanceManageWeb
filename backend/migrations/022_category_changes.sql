CREATE TABLE category_changes (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 cost INTEGER NOT NULL CHECK(cost IN (0,100)),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
