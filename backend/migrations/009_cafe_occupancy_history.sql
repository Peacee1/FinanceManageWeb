ALTER TABLE cafe_tables ADD COLUMN occupied_since TIMESTAMPTZ;
UPDATE cafe_tables t SET occupied_since=COALESCE((SELECT started_at FROM cafe_table_sessions s WHERE s.id=t.current_session_id),clock_timestamp()) WHERE is_occupied;
CREATE TABLE cafe_occupancy_history (
  id BIGSERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  opened_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_estimated BOOLEAN NOT NULL DEFAULT false,
  CHECK (closed_at IS NULL OR closed_at>=started_at)
);
CREATE UNIQUE INDEX cafe_occupancy_one_open ON cafe_occupancy_history(table_id) WHERE closed_at IS NULL;
CREATE INDEX cafe_occupancy_day ON cafe_occupancy_history(business_id,table_id,started_at DESC,id DESC);
CREATE INDEX cafe_occupancy_closed_day ON cafe_occupancy_history(business_id,table_id,closed_at,id DESC);
INSERT INTO cafe_occupancy_history(business_id,table_id,started_at,start_estimated)
SELECT business_id,id,occupied_since,current_session_id IS NULL FROM cafe_tables WHERE is_occupied AND deleted_at IS NULL;
CREATE FUNCTION cafe_occupancy_start() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_occupied AND NOT OLD.is_occupied THEN
    NEW.occupied_since:=COALESCE((SELECT started_at FROM cafe_table_sessions WHERE id=NEW.current_session_id),clock_timestamp());
  ELSIF NOT NEW.is_occupied OR NEW.deleted_at IS NOT NULL THEN
    NEW.occupied_since:=NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cafe_occupancy_start BEFORE UPDATE ON cafe_tables FOR EACH ROW EXECUTE FUNCTION cafe_occupancy_start();
CREATE FUNCTION cafe_occupancy_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_occupied AND NOT OLD.is_occupied AND NEW.deleted_at IS NULL THEN
    INSERT INTO cafe_occupancy_history(business_id,table_id,started_at,opened_by) VALUES (NEW.business_id,NEW.id,NEW.occupied_since,NEW.updated_by);
  ELSIF OLD.is_occupied AND (NOT NEW.is_occupied OR NEW.deleted_at IS NOT NULL) THEN
    UPDATE cafe_occupancy_history SET closed_at=clock_timestamp(),closed_by=NEW.updated_by WHERE table_id=NEW.id AND closed_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER cafe_occupancy_record AFTER UPDATE ON cafe_tables FOR EACH ROW EXECUTE FUNCTION cafe_occupancy_record();
