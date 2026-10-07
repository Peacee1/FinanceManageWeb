ALTER TABLE users DROP CONSTRAINT IF EXISTS users_personal_accent_check;
ALTER TABLE users ADD CONSTRAINT users_personal_accent_check CHECK (personal_accent IN ('purple','pink','green','blue','yellow','monochrome'));
