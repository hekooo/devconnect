-- Create the stories bucket if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'stories'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'stories',
      'stories',
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'video/mp4']
    );
  END IF;
END $$;

-- Create a policy to allow authenticated users to upload files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Stories media upload policy'
  ) THEN
    CREATE POLICY "Stories media upload policy"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'stories'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Create a policy to allow public access to story media
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Stories media access policy'
  ) THEN
    CREATE POLICY "Stories media access policy"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'stories');
  END IF;
END $$;