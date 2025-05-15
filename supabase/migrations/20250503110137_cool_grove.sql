/*
  # Create storage buckets for chat media
  
  1. New Storage Buckets
    - `chat-images` bucket for images shared in chats
    - `chat-files` bucket for files shared in chats
  
  2. Security
    - Public read access for both buckets
    - Authenticated users can upload their own files
    - File type and size restrictions
*/

-- Create chat-images bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'chat-images',
      'chat-images',
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
  END IF;
END $$;

-- Create chat-files bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-files'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES (
      'chat-files',
      'chat-files',
      true,
      20971520 -- 20MB limit
    );
  END IF;
END $$;

-- Set up security policies for chat-images bucket
DO $$ 
BEGIN
  -- Public access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Chat images are publicly accessible'
  ) THEN
    CREATE POLICY "Chat images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-images');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload chat images'
  ) THEN
    CREATE POLICY "Users can upload chat images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'chat-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
      AND (LOWER(storage.extension(name)) = 'jpg' 
        OR LOWER(storage.extension(name)) = 'jpeg'
        OR LOWER(storage.extension(name)) = 'png'
        OR LOWER(storage.extension(name)) = 'gif'
        OR LOWER(storage.extension(name)) = 'webp')
      AND length(name) < 5242880 -- 5MB file size limit
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own chat images'
  ) THEN
    CREATE POLICY "Users can delete their own chat images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'chat-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Set up security policies for chat-files bucket
DO $$ 
BEGIN
  -- Public access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Chat files are publicly accessible'
  ) THEN
    CREATE POLICY "Chat files are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-files');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload chat files'
  ) THEN
    CREATE POLICY "Users can upload chat files"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'chat-files'
      AND auth.uid()::text = (storage.foldername(name))[1]
      AND length(name) < 20971520 -- 20MB file size limit
    );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own chat files'
  ) THEN
    CREATE POLICY "Users can delete their own chat files"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'chat-files'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;