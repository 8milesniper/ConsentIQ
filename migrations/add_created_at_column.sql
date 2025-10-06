-- Add created_at column for proper ordering
-- Run this in your Supabase SQL Editor

-- Add created_at column with default to current timestamp
ALTER TABLE consent_sessions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Backfill created_at with session_start_time for existing records
UPDATE consent_sessions 
SET created_at = session_start_time 
WHERE created_at IS NULL OR created_at = NOW();

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_consent_sessions_created_at 
ON consent_sessions(created_at DESC);
