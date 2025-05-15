/*
  # Fix blog covers storage bucket policies
  
  1. Changes
    - Drop existing policies that are causing issues
    - Create new policies with proper RLS rules
    - Allow authenticated users to upload to blog-covers bucket
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Blog covers are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own blog covers" ON storage.objects;
END $$;

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

-- Create new policies
CREATE POLICY "Blog covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-covers');

CREATE POLICY "Users can upload blog covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-covers'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own blog covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-covers'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own blog covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-covers'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);