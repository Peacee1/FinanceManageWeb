CREATE TABLE ai_review_purchases (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 input_hash CHAR(64) NOT NULL,
 price INTEGER NOT NULL DEFAULT 100 CHECK(price=100),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
