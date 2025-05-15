/*
  # Fix blog covers storage policies
  
  1. Changes
    - Create blog-covers bucket if it doesn't exist
    - Check for existing policies before creating new ones
    - Add proper RLS policies for blog cover images
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

-- Create new policies with existence checks
DO $$ 
BEGIN
  -- Select policy
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

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload blog covers'
  ) THEN
    CREATE POLICY "Users can upload blog covers"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'blog-covers' AND
      auth.role() = 'authenticated'
    );
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update blog covers'
  ) THEN
    CREATE POLICY "Users can update blog covers"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'blog-covers' AND
      auth.role() = 'authenticated'
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete blog covers'
  ) THEN
    CREATE POLICY "Users can delete blog covers"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'blog-covers' AND
      auth.role() = 'authenticated'
    );
  END IF;
END $$;