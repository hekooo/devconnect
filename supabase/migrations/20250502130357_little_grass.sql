-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true);

-- Set up security policies for the bucket
CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

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

CREATE POLICY "Users can update their own blog images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);