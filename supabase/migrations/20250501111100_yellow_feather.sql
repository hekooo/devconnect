/*
  # Create storage bucket for blog posts

  1. New Storage Bucket
    - Create 'posts' bucket for storing blog post images
    - Enable public access for viewing images
  
  2. Security
    - Allow authenticated users to upload images
    - Allow public access to view images
    - Restrict update/delete to file owners
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true);

-- Set up security policies for the bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);