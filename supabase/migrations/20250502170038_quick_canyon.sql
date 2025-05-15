/*
  # Create Developer Reels Feature

  1. New Tables
    - `developer_reels` - For storing reel metadata
    - `reel_comments` - For comments on reels
    - `reel_likes` - For likes on reels

  2. Storage
    - Create reels bucket for storing video content
    - Set up public read access
    - Allow authenticated users to upload

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create developer_reels table
CREATE TABLE IF NOT EXISTS developer_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration integer,
  tags text[],
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reel_comments table
CREATE TABLE IF NOT EXISTS reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid REFERENCES developer_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reel_likes table
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid REFERENCES developer_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reels storage bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'reels'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'reels',
      'reels',
      true,
      104857600, -- 100MB limit
      ARRAY['video/mp4', 'video/webm', 'video/quicktime']
    );
  END IF;
END $$;

-- Create reels thumbnails storage bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'reel-thumbnails'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('reel-thumbnails', 'reel-thumbnails', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE developer_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for developer_reels
CREATE POLICY "Reels are viewable by everyone"
  ON developer_reels FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reels"
  ON developer_reels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
  ON developer_reels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
  ON developer_reels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for reel_comments
CREATE POLICY "Comments are viewable by everyone"
  ON reel_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON reel_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON reel_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON reel_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for reel_likes
CREATE POLICY "Likes are viewable by everyone"
  ON reel_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create likes"
  ON reel_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON reel_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage policies for reels bucket
CREATE POLICY "Reels are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reels'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (LOWER(storage.extension(name)) = 'mp4' 
      OR LOWER(storage.extension(name)) = 'webm'
      OR LOWER(storage.extension(name)) = 'mov')
  );

CREATE POLICY "Users can delete their own reels"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reels'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policies for reel-thumbnails bucket
CREATE POLICY "Reel thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reel-thumbnails');

CREATE POLICY "Users can upload reel thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reel-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (LOWER(storage.extension(name)) = 'jpg' 
      OR LOWER(storage.extension(name)) = 'jpeg'
      OR LOWER(storage.extension(name)) = 'png')
  );

CREATE POLICY "Users can delete their own reel thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reel-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_reel_view_count(reel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE developer_reels
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = reel_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_reel_view_count(uuid) TO authenticated;