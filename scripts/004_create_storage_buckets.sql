-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to update their images
CREATE POLICY "Allow updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images');

-- Allow authenticated users to delete their images
CREATE POLICY "Allow deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'images');
