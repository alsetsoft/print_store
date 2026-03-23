-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_subcategory_id BIGINT REFERENCES subcategories(id) ON DELETE SET NULL,
  print_subcategory_id BIGINT REFERENCES subcategories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_groups junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS product_groups (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, group_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_groups_product_id ON product_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_product_groups_group_id ON product_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_base_subcategory ON groups(base_subcategory_id);
CREATE INDEX IF NOT EXISTS idx_groups_print_subcategory ON groups(print_subcategory_id);
