-- Base Categories
CREATE TABLE IF NOT EXISTS base_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base Subcategories
CREATE TABLE IF NOT EXISTS base_subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  base_category_id INT REFERENCES base_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print Design Categories
CREATE TABLE IF NOT EXISTS print_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print Design Subcategories
CREATE TABLE IF NOT EXISTS print_subcategories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  print_category_id INT REFERENCES print_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colors
CREATE TABLE IF NOT EXISTS colors (
  id SERIAL PRIMARY KEY,
  hex TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sizes
CREATE TABLE IF NOT EXISTS sizes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Areas (print zones)
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  x1 DOUBLE PRECISION NOT NULL DEFAULT 0,
  x2 DOUBLE PRECISION NOT NULL DEFAULT 0,
  x3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  x4 DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bases (products like t-shirts, mugs, etc.)
CREATE TABLE IF NOT EXISTS bases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  base_category_id INT REFERENCES base_categories(id) ON DELETE SET NULL,
  base_subcategory_id INT REFERENCES base_subcategories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base Sizes (junction table for base-size relationship with price)
CREATE TABLE IF NOT EXISTS base_sizes (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  size_id INT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_id, size_id)
);

-- Base Colors (junction table for base-color relationship)
CREATE TABLE IF NOT EXISTS base_colors (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  color_id INT NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_id, color_id)
);

-- Base Color Photos (photos for each color variant of a base)
CREATE TABLE IF NOT EXISTS base_color_photos (
  id SERIAL PRIMARY KEY,
  base_color_id INT NOT NULL REFERENCES base_colors(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  side TEXT NOT NULL DEFAULT 'front',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base Color Photo Areas (print areas on each photo)
CREATE TABLE IF NOT EXISTS base_color_photo_areas (
  id SERIAL PRIMARY KEY,
  base_color_photo_id INT NOT NULL REFERENCES base_color_photos(id) ON DELETE CASCADE,
  area_id INT REFERENCES areas(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  section_name TEXT,
  is_max BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print Designs
CREATE TABLE IF NOT EXISTS print_designs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  print_category_id INT REFERENCES print_categories(id) ON DELETE SET NULL,
  print_subcategory_id INT REFERENCES print_subcategories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print Design Color Photos (different color variants of a print)
CREATE TABLE IF NOT EXISTS print_design_color_photos (
  id SERIAL PRIMARY KEY,
  print_design_id INT NOT NULL REFERENCES print_designs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  color_id INT REFERENCES colors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base Color Photo Area Prints (junction table linking print areas with prints)
CREATE TABLE IF NOT EXISTS base_color_photo_area_prints (
  id SERIAL PRIMARY KEY,
  base_color_photo_area_id INT NOT NULL REFERENCES base_color_photo_areas(id) ON DELETE CASCADE,
  print_area_id INT REFERENCES areas(id) ON DELETE SET NULL,
  print_design_id INT NOT NULL REFERENCES print_designs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  quantity INT NOT NULL DEFAULT 1,
  base_color_photo_area_print_id INT REFERENCES base_color_photo_area_prints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bases_category ON bases(base_category_id);
CREATE INDEX IF NOT EXISTS idx_bases_subcategory ON bases(base_subcategory_id);
CREATE INDEX IF NOT EXISTS idx_base_sizes_base ON base_sizes(base_id);
CREATE INDEX IF NOT EXISTS idx_base_colors_base ON base_colors(base_id);
CREATE INDEX IF NOT EXISTS idx_base_color_photos_base_color ON base_color_photos(base_color_id);
CREATE INDEX IF NOT EXISTS idx_print_designs_category ON print_designs(print_category_id);
CREATE INDEX IF NOT EXISTS idx_print_designs_subcategory ON print_designs(print_subcategory_id);
CREATE INDEX IF NOT EXISTS idx_print_design_color_photos_print ON print_design_color_photos(print_design_id);
