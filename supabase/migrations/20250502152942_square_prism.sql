/*
  # Fix blog-covers storage policy
  
  1. Changes
    - Remove folder name check from upload policy
    - Allow any authenticated user to upload to blog-covers bucket
    - Maintain other security restrictions
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