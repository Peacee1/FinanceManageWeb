ALTER TABLE rokbot_licenses ADD COLUMN auto_run boolean NOT NULL DEFAULT false;
UPDATE rokbot_licenses l SET auto_run=true WHERE l.expires_at>now() AND EXISTS (
 SELECT 1 FROM rokbot_accounts a, jsonb_array_elements(a.governors) g WHERE a.user_id=l.user_id AND g->>'enabled'='true'
);
