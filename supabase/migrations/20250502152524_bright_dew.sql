/*
  # Fix blog-covers storage bucket policy
  
  1. Changes
    - Update the INSERT policy for blog-covers bucket
    - Remove the auth.uid() check from the folder name
    - Allow any authenticated user to upload to the bucket
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can upload blog covers" ON storage.objects;

-- Create new policy without the folder name check
CREATE POLICY "Users can upload blog covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-covers'
  AND auth.role() = 'authenticated'
);