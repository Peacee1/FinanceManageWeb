CREATE TABLE ai_reviews (
 id BIGSERIAL PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 input_hash CHAR(64) NOT NULL,
 month CHAR(7) NOT NULL,
 language VARCHAR(2) NOT NULL CHECK(language IN ('vi','en','zh','ja','ko','ru')),
 ledger VARCHAR(10) NOT NULL CHECK(ledger IN ('personal','family','business')),
 analysis TEXT NOT NULL CHECK(length(analysis)<=12000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,input_hash)
);
CREATE INDEX ai_review_history ON ai_reviews(user_id,id DESC);
