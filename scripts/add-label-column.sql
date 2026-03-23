-- Add label column to base_images table
ALTER TABLE base_images ADD COLUMN IF NOT EXISTS label TEXT;
