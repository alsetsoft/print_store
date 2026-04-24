-- Adds a per-product list of colors that should be hidden from the catalog card
-- swatches and the /product/[id] color picker. Empty array = show every base color.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hidden_color_ids INTEGER[] NOT NULL DEFAULT '{}';
