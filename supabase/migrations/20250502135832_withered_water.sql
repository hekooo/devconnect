/*
  # Create blog-covers storage bucket
  
  1. Storage Bucket
    - Create bucket for storing blog cover images
    - Make bucket publicly readable
    - Add security policies for user uploads
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

-- Set up security policies for the bucket
DO $$ 
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Blog covers are publicly accessible'
  ) THEN
    CREATE POLICY "Blog covers are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'blog-covers');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload blog covers'
  ) THEN
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
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own blog covers'
  ) THEN
    CREATE POLICY "Users can update their own blog covers"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'blog-covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own blog covers'
  ) THEN
    CREATE POLICY "Users can delete their own blog covers"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'blog-covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;