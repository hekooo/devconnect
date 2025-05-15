/*
  # Profile enhancements

  1. New Columns
    - Add skills array
    - Add tech_stack array
    - Add experience JSONB
    - Add role and badge fields
    - Add rank field
    - Add social links

  2. Security
    - Enable RLS
    - Add policies for profile access and updates
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tech_stack text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'::text
  CHECK (role = ANY (ARRAY['user'::text, 'moderator'::text, 'admin'::text])),
ADD COLUMN IF NOT EXISTS badge text,
ADD COLUMN IF NOT EXISTS rank text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create policies for follows
CREATE POLICY "Users can view follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create function to update user rank based on followers
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
DECLARE
  follower_count INTEGER;
BEGIN
  -- Get follower count for the user being followed
  SELECT COUNT(*) INTO follower_count
  FROM follows
  WHERE following_id = NEW.following_id;
  
  -- Update rank based on follower count
  UPDATE profiles
  SET rank = CASE
    WHEN follower_count >= 1000 THEN 'Diamond'
    WHEN follower_count >= 500 THEN 'Platinum'
    WHEN follower_count >= 100 THEN 'Gold'
    WHEN follower_count >= 50 THEN 'Silver'
    WHEN follower_count >= 10 THEN 'Bronze'
    ELSE 'Rookie'
  END
  WHERE id = NEW.following_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rank updates
CREATE TRIGGER update_user_rank_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_user_rank();