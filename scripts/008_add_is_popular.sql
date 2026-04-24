-- Adds an is_popular boolean flag to bases, products, and print_designs so that
-- the public sort "Популярне" has a backing metric. Admin can flip the flag per item;
-- sorting orders flagged items first, then falls back to created_at DESC.

ALTER TABLE bases         ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products      ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE print_designs ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bases_is_popular         ON bases(is_popular)         WHERE is_popular;
CREATE INDEX IF NOT EXISTS idx_products_is_popular      ON products(is_popular)      WHERE is_popular;
CREATE INDEX IF NOT EXISTS idx_print_designs_is_popular ON print_designs(is_popular) WHERE is_popular;
