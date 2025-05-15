/*
  # Create storage buckets for user uploads

  1. New Storage Buckets
    - `avatars` bucket for profile pictures
    - `covers` bucket for profile cover images
  
  2. Security
    - Public read access for both buckets
    - Authenticated users can upload their own images
    - File type restrictions (jpg, jpeg, png, gif)
    - 5MB file size limit
*/

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create covers bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true);

-- Set up security policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

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

-- Set up security policies for covers bucket
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

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