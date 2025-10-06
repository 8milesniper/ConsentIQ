-- Enable permanent retention for consent sessions
-- Run this in your Supabase SQL Editor

-- Make retention_until and delete_after_days nullable to support permanent retention
ALTER TABLE consent_sessions 
ALTER COLUMN retention_until DROP NOT NULL,
ALTER COLUMN delete_after_days DROP NOT NULL;

-- Update existing records with 90-day retention to permanent (optional)
-- Uncomment the following lines if you want to convert all existing records to permanent retention:
-- UPDATE consent_sessions 
-- SET retention_until = NULL, delete_after_days = NULL
-- WHERE retention_until IS NOT NULL;
