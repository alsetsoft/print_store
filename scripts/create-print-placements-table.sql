-- Create table for storing print placements on product zones
CREATE TABLE IF NOT EXISTS product_print_placements (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  zone_id BIGINT NOT NULL REFERENCES image_zones(id) ON DELETE CASCADE,
  x NUMERIC DEFAULT 50,
  y NUMERIC DEFAULT 50,
  scale NUMERIC DEFAULT 100,
  is_mirrored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, zone_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_print_placements_product_id ON product_print_placements(product_id);
