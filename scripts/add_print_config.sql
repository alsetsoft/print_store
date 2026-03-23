-- Run this in Supabase Dashboard → SQL Editor
ALTER TABLE products ADD COLUMN IF NOT EXISTS print_config JSONB;
