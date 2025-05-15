/*
  # Fix likes table RLS policies

  1. Changes
    - Update RLS policies for likes table
    - Ensure authenticated users can create and delete likes
    - Fix policy that was causing "Failed to upload like status" error

  2. Security
    - Maintain RLS protection while allowing necessary operations
    - Ensure users can only manage their own likes
*/

-- Enable RLS on likes table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "Users can view all likes" ON likes;

-- Create new policies with proper permissions
CREATE POLICY "Users can create their own likes"
ON likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all likes"
ON likes
FOR SELECT
TO public
USING (true);