-- Restructure consent_sessions table with new field names
-- Run this in your Supabase SQL Editor

-- Add new columns
ALTER TABLE consent_sessions 
ADD COLUMN IF NOT EXISTS initiator_profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS recipient_full_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS verified_over_18 BOOLEAN DEFAULT true;

-- Copy data from old columns to new columns
UPDATE consent_sessions 
SET 
  recipient_full_name = participant_name,
  recipient_phone = participant_phone,
  verified_over_18 = CASE WHEN participant_age >= 18 THEN true ELSE false END
WHERE recipient_full_name IS NULL;

-- Backfill initiator_profile_picture_url from users table
UPDATE consent_sessions cs
SET initiator_profile_picture_url = u.profile_picture_url
FROM users u
WHERE cs.initiator_user_id = u.id AND cs.initiator_profile_picture_url IS NULL;

-- Make recipient_full_name NOT NULL after data migration
ALTER TABLE consent_sessions 
ALTER COLUMN recipient_full_name SET NOT NULL;

-- Make verified_over_18 NOT NULL after data migration
ALTER TABLE consent_sessions 
ALTER COLUMN verified_over_18 SET NOT NULL;

-- Optional: Drop old columns (uncomment when you're sure the migration worked)
-- ALTER TABLE consent_sessions 
-- DROP COLUMN IF EXISTS participant_name,
-- DROP COLUMN IF EXISTS participant_phone,
-- DROP COLUMN IF EXISTS participant_age;
