/*
  # Fix likes table permissions

  1. Changes
    - Enable RLS on likes table
    - Add policies for CRUD operations on likes table
    - Ensure proper access control for likes

  2. Security
    - Enable RLS
    - Add policies for:
      - Selecting likes (public can view all likes)
      - Creating likes (authenticated users can create their own likes)
      - Deleting likes (users can delete their own likes)

  3. Notes
    - Policies ensure users can only manage their own likes
    - Public read access for likes to enable like counts and status
*/

-- Enable RLS on likes table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "Users can view all likes" ON likes;

-- Create policies for likes table
CREATE POLICY "Users can create their own likes"
ON likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own likes"
ON likes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can view all likes"
ON likes
FOR SELECT
TO public
USING (
  true
);