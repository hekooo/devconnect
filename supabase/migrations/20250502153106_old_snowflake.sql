/*
  # Fix blog-covers storage bucket policy
  
  1. Changes
    - Simplify the blog-covers upload policy to only require authentication
    - Remove folder name restriction that was causing upload failures
    - Maintain existing policies for public access and user management
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