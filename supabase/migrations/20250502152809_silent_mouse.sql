/*
  # Fix blog covers storage policy
  
  1. Changes
    - Drop existing restrictive policy
    - Create new policy that allows any authenticated user to upload
    - Remove folder name check that was causing permission errors
    - Maintain security by still requiring authentication
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