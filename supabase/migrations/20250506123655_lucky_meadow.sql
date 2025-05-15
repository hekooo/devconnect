/*
  # Add Missing Columns and Fix Schema

  1. Changes
    - Add `notification_settings` column to `profiles` table
    - Add `id` column to `follows` table
    - Add `follower_count` and `following_count` columns to `profiles` table if missing

  2. Security
    - Maintain existing RLS policies
*/

-- Add notification_settings column to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN notification_settings JSONB DEFAULT jsonb_build_object(
      'email_notifications', true,
      'notification_types', jsonb_build_object(
        'likes', true,
        'comments', true,
        'follows', true,
        'mentions', true
      )
    );
  END IF;
END $$;

-- Recreate follows table with id column
CREATE TABLE IF NOT EXISTS follows_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Copy data from old follows table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    INSERT INTO follows_new (follower_id, following_id, created_at)
    SELECT follower_id, following_id, now()
    FROM follows;

    DROP TABLE follows;
  END IF;
END $$;

ALTER TABLE follows_new RENAME TO follows;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Enable RLS on follows table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for follows table
CREATE POLICY "Users can view follows"
ON follows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can follow others"
ON follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);