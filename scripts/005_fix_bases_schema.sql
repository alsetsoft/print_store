-- Ensure bases table has all needed columns aligned with the real schema
-- Add image_url as a simple column for thumbnail/main image
ALTER TABLE bases ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure sku exists (original schema has it)
ALTER TABLE bases ADD COLUMN IF NOT EXISTS sku TEXT;

-- Rename price -> base_price if price exists and base_price doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bases' AND column_name='price')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bases' AND column_name='base_price') THEN
    ALTER TABLE bases RENAME COLUMN price TO base_price;
  END IF;
END$$;

-- Add base_price if it doesn't exist
ALTER TABLE bases ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add description/name columns to categories if missing (from 003 migration)
ALTER TABLE base_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE base_subcategories ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure base_subcategories table links properly
ALTER TABLE base_subcategories ADD COLUMN IF NOT EXISTS base_category_id INT REFERENCES base_categories(id) ON DELETE CASCADE;
