CREATE TABLE rokbot_codes (
 id bigserial PRIMARY KEY, code_hash varchar(64) UNIQUE NOT NULL,
 days integer NOT NULL CHECK(days IN (30,90,365)),
 capacity integer NOT NULL CHECK(capacity IN (6,10,20,50)),
 created_by bigint REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 redeemed_by bigint REFERENCES users(id), redeemed_at timestamptz
);
CREATE TABLE rokbot_licenses (
 user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 code_id bigint NOT NULL REFERENCES rokbot_codes(id), capacity integer NOT NULL,
 expires_at timestamptz NOT NULL
);
