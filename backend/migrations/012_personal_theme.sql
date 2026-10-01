ALTER TABLE users ADD COLUMN personal_accent VARCHAR(10) NOT NULL DEFAULT 'purple'
  CHECK (personal_accent IN ('purple','pink','green','blue','yellow'));
