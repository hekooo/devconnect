/*
  # Create saved reels table

  1. New Tables
    - `saved_reels`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `reel_id` (uuid, references developer_reels)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `saved_reels` table
    - Add policies for authenticated users to manage their saved reels
*/

CREATE TABLE IF NOT EXISTS saved_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES developer_reels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reel_id)
);

ALTER TABLE saved_reels ENABLE ROW LEVEL SECURITY;

-- Allow users to save reels
CREATE POLICY "Users can save reels"
  ON saved_reels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to unsave reels
CREATE POLICY "Users can unsave reels"
  ON saved_reels
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to view their saved reels
CREATE POLICY "Users can view their saved reels"
  ON saved_reels
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);