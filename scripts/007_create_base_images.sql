-- Create base_images table to store multiple images per base
CREATE TABLE IF NOT EXISTS base_images (
  id BIGSERIAL PRIMARY KEY,
  base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE base_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on base_images" ON base_images FOR ALL USING (true) WITH CHECK (true);
