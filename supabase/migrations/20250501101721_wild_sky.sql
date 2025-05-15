/*
  # Add Stories Feature

  1. New Tables
    - `stories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `media_url` (text)
      - `caption` (text, nullable)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

    - `story_views`
      - `id` (uuid, primary key)
      - `story_id` (uuid, references stories)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for story creation and viewing
    - Add policies for tracking views
*/

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create story views table
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Create policies for stories
CREATE POLICY "Users can view all active stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON stories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for story views
CREATE POLICY "Users can view story view counts"
  ON story_views
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can track their story views"
  ON story_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS trigger AS $$
BEGIN
  DELETE FROM stories WHERE expires_at <= now();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up expired stories
CREATE TRIGGER cleanup_expired_stories
  AFTER INSERT OR UPDATE ON stories
  EXECUTE FUNCTION delete_expired_stories();