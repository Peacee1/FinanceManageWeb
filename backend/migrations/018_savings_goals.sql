CREATE TABLE savings_goals (
 id SERIAL PRIMARY KEY,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 family_id INTEGER REFERENCES families(id),
 name VARCHAR(100) NOT NULL,
 target_amount BIGINT NOT NULL CHECK(target_amount BETWEEN 1 AND 1000000000000),
 current_amount BIGINT NOT NULL DEFAULT 0 CHECK(current_amount BETWEEN 0 AND 1000000000000),
 deadline DATE,
 monthly_amount BIGINT NOT NULL DEFAULT 0 CHECK(monthly_amount BETWEEN 0 AND 1000000000000),
 priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK(priority IN ('high','normal','low')),
 status VARCHAR(15) NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
 reminder VARCHAR(10) NOT NULL DEFAULT 'none' CHECK(reminder IN ('none','weekly','monthly')),
 reminder_day INTEGER NOT NULL DEFAULT 1 CHECK(reminder_day BETWEEN 1 AND 31),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE savings_goals ADD COLUMN create_request_id UUID;
ALTER TABLE savings_goals ADD COLUMN create_request_hash TEXT;
CREATE UNIQUE INDEX savings_goal_create_request ON savings_goals(owner_id,create_request_id);
CREATE INDEX savings_goal_personal ON savings_goals(owner_id) WHERE family_id IS NULL;
CREATE INDEX savings_goal_family ON savings_goals(family_id) WHERE family_id IS NOT NULL;
CREATE TABLE savings_goal_entries (
 id SERIAL PRIMARY KEY,
 goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
 user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 actor_name VARCHAR(100) NOT NULL,
 kind VARCHAR(10) NOT NULL CHECK(kind IN ('OPENING','DEPOSIT','WITHDRAW')),
 amount BIGINT NOT NULL CHECK(amount BETWEEN 1 AND 1000000000000),
 note VARCHAR(500) NOT NULL DEFAULT '',
 request_id UUID NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(goal_id,request_id)
);
CREATE INDEX savings_goal_history ON savings_goal_entries(goal_id,id DESC);
-- Preserve only goals actually saved by users; no fabricated default goals.
DO $$
DECLARE u RECORD; g INTEGER; target NUMERIC; saved NUMERIC;
BEGIN
 FOR u IN SELECT id,name,user_goal FROM users WHERE role='owner' AND jsonb_typeof(user_goal)='object' LOOP
  IF coalesce(u.user_goal->>'name','')='' OR length(u.user_goal->>'name')>100 OR coalesce(u.user_goal->>'targetAmount','') !~ '^[0-9]{1,13}$' THEN CONTINUE; END IF;
  target := (u.user_goal->>'targetAmount')::numeric;
  IF target<1 OR target>1000000000000 THEN CONTINUE; END IF;
  saved := CASE WHEN coalesce(u.user_goal->>'currentSaved','') ~ '^[0-9]{1,13}$' THEN (u.user_goal->>'currentSaved')::numeric ELSE 0 END;
  IF saved>1000000000000 THEN CONTINUE; END IF;
  INSERT INTO savings_goals(owner_id,name,target_amount,current_amount,status) VALUES(u.id,u.user_goal->>'name',target,saved,CASE WHEN saved>=target THEN 'completed' ELSE 'active' END) RETURNING id INTO g;
  BEGIN
   IF u.user_goal->>'deadline' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN UPDATE savings_goals SET deadline=(u.user_goal->>'deadline')::date WHERE id=g; END IF;
  EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN NULL;
  END;
  IF saved>0 THEN INSERT INTO savings_goal_entries(goal_id,user_id,actor_name,kind,amount,note,request_id) VALUES(g,u.id,u.name,'OPENING',saved,'Số tiền đã dành trong mục tiêu cũ',gen_random_uuid()); END IF;
 END LOOP;
END; $$;
