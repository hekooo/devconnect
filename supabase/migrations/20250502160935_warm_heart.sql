/*
  # Fix blog covers storage policies
  
  1. Changes
    - Update storage policies for blog-covers bucket
    - Ensure authenticated users can upload images
    - Make images publicly accessible
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

-- Create new policies with simplified checks
CREATE POLICY "Blog covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-covers');

CREATE POLICY "Users can upload blog covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-covers' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update blog covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-covers' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete blog covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-covers' AND
  auth.role() = 'authenticated'
);