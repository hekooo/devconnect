/*
  # Fix blog storage permissions

  1. Changes
    - Create blog-covers bucket
    - Set up proper RLS policies for blog cover images
    - Allow authenticated users to manage their own covers
    - Enable public read access
*/

-- Create blog-covers bucket if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'blog-covers'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('blog-covers', 'blog-covers', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Blog covers are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own blog covers" ON storage.objects;
END $$;

-- Create new policies
CREATE POLICY "Blog covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-covers');

CREATE POLICY "Users can upload blog covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (LOWER(storage.extension(name)) = 'jpg' 
    OR LOWER(storage.extension(name)) = 'jpeg'
    OR LOWER(storage.extension(name)) = 'png'
    OR LOWER(storage.extension(name)) = 'gif')
  AND length(name) < 5242880 -- 5MB file size limit
);

CREATE POLICY "Users can update their own blog covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own blog covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);