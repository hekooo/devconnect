/*
  # Create blog covers bucket and policies
  
  1. Storage
    - Create blog covers bucket for storing cover images
    - Set up public read access
    - Allow authenticated users to upload
*/

-- Create the storage bucket if it doesn't exist
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
  -- Public access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Anyone can view blog covers'
  ) THEN
    CREATE POLICY "Anyone can view blog covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'blog-covers');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload blog covers'
  ) THEN
    CREATE POLICY "Authenticated users can upload blog covers"
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