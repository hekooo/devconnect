/*
  # Create post-images storage bucket
  
  1. Storage Bucket
    - Create bucket for storing post images
    - Make bucket publicly readable
    - Add security policies for user uploads
*/

-- Create post-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DO $$ BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public Access to Post Images'
  ) THEN
    CREATE POLICY "Public Access to Post Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users Can Upload Post Images'
  ) THEN
    CREATE POLICY "Users Can Upload Post Images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'post-images'
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
    AND policyname = 'Users Can Update Own Post Images'
  ) THEN
    CREATE POLICY "Users Can Update Own Post Images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users Can Delete Own Post Images'
  ) THEN
    CREATE POLICY "Users Can Delete Own Post Images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;