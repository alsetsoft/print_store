-- Add missing columns to categories
ALTER TABLE base_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE print_categories ADD COLUMN IF NOT EXISTS description TEXT;

-- Fix areas table to have proper columns
ALTER TABLE areas ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS description TEXT;

-- Fix colors table column name
ALTER TABLE colors RENAME COLUMN hex TO hex_code;

-- Add sort_order to sizes
ALTER TABLE sizes ADD COLUMN IF NOT EXISTS sort_order INT;

-- Add image_url to print_designs
ALTER TABLE print_designs ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add base_price and image_url to bases
ALTER TABLE bases ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2);
ALTER TABLE bases ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Rename category columns in bases to match expected names
-- First check if columns exist and rename
DO $$ 
BEGIN
  -- Update bases table to use category_id as alias
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bases' AND column_name = 'base_category_id') THEN
    -- The column exists, create a view or handle the mapping
    NULL;
  END IF;
END $$;

-- Rename category columns in print_designs to match expected names  
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_designs' AND column_name = 'print_category_id') THEN
    NULL;
  END IF;
END $$;
