-- Add username tracking columns to video_assets and consent_sessions tables
-- Run this in your Supabase SQL Editor

-- Add columns to video_assets
ALTER TABLE video_assets 
ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS owner_full_name TEXT;

-- Add column to consent_sessions
ALTER TABLE consent_sessions 
ADD COLUMN IF NOT EXISTS initiator_full_name TEXT;

-- Backfill existing records with user names
UPDATE consent_sessions cs
SET initiator_full_name = u.full_name
FROM users u
WHERE cs.initiator_user_id = u.id AND cs.initiator_full_name IS NULL;

UPDATE video_assets va
SET 
  owner_user_id = cs.initiator_user_id,
  owner_full_name = u.full_name
FROM consent_sessions cs
JOIN users u ON cs.initiator_user_id = u.id
WHERE va.id = cs.video_asset_id 
  AND cs.video_asset_id IS NOT NULL 
  AND va.owner_user_id IS NULL;
