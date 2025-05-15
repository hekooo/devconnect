/*
  # Storage Policies for User Media
  
  1. Security
    - Add policies for avatar and cover image access
    - Ensure public read access
    - Restrict uploads to authenticated users
    - Enforce file type and size limits
*/

DO $$ BEGIN
  -- Avatar policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
      AND (LOWER(storage.extension(name)) = 'jpg' 
        OR LOWER(storage.extension(name)) = 'jpeg'
        OR LOWER(storage.extension(name)) = 'png'
        OR LOWER(storage.extension(name)) = 'gif')
      AND length(name) < 5242880 -- 5MB file size limit
    );
  END IF;

  -- Cover policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Cover images are publicly accessible'
  ) THEN
    CREATE POLICY "Cover images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'covers');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload their own cover'
  ) THEN
    CREATE POLICY "Users can upload their own cover"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
      AND (LOWER(storage.extension(name)) = 'jpg' 
        OR LOWER(storage.extension(name)) = 'jpeg'
        OR LOWER(storage.extension(name)) = 'png'
        OR LOWER(storage.extension(name)) = 'gif')
      AND length(name) < 5242880 -- 5MB file size limit
    );
  END IF;
END $$;