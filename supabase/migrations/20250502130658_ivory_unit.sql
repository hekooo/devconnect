-- Create storage bucket for blog images if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'blog-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('blog-images', 'blog-images', true);
  END IF;
END $$;

-- Set up security policies for the bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Blog images are publicly accessible'
  ) THEN
    CREATE POLICY "Blog images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'blog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload blog images'
  ) THEN
    CREATE POLICY "Users can upload blog images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'blog-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
      AND (LOWER(storage.extension(name)) = 'jpg' 
        OR LOWER(storage.extension(name)) = 'jpeg'
        OR LOWER(storage.extension(name)) = 'png'
        OR LOWER(storage.extension(name)) = 'gif')
      AND length(name) < 5242880 -- 5MB file size limit
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update their own blog images'
  ) THEN
    CREATE POLICY "Users can update their own blog images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'blog-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their own blog images'
  ) THEN
    CREATE POLICY "Users can delete their own blog images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'blog-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;