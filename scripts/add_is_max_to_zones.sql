-- Add is_max boolean column to image_zones table
-- This marks the maximum zone within which other zones must be created
ALTER TABLE image_zones ADD COLUMN IF NOT EXISTS is_max BOOLEAN DEFAULT FALSE;
