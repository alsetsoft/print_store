-- Adds an is_previewable flag on products so the storefront catalog can surface
-- exactly one product per (base_id, print_id) combo as the "cover" variant, while
-- sibling color variants remain reachable via color swatches on the card.

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_previewable BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: pick the lowest-id product per (base_id, print_id) group.
WITH firsts AS (
  SELECT DISTINCT ON (base_id, print_id) id
  FROM products
  ORDER BY base_id, print_id, id
)
UPDATE products
SET is_previewable = TRUE
WHERE id IN (SELECT id FROM firsts);

-- DB-level guarantee: at most one previewable per (base_id, print_id) group.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_one_previewable
  ON products (base_id, print_id)
  WHERE is_previewable = TRUE;
