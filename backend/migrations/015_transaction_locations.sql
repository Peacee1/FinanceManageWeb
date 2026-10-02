ALTER TABLE users ADD COLUMN maps_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN location JSONB;
ALTER TABLE transactions ADD CONSTRAINT valid_location CHECK (location IS NULL OR (
  jsonb_typeof(location)='object' AND location ? 'lat' AND location ? 'lng' AND
  jsonb_typeof(location->'lat')='number' AND jsonb_typeof(location->'lng')='number' AND
  (location->>'lat')::numeric BETWEEN -90 AND 90 AND (location->>'lng')::numeric BETWEEN -180 AND 180
));
