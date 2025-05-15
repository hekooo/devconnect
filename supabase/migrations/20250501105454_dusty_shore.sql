/*
  # Add RLS policies for likes table

  1. Security Changes
    - Enable RLS on `likes` table (if not already enabled)
    - Add policies for authenticated users to:
      - Create their own likes
      - Delete their own likes
      - View all likes (for like counts and status)

  2. Notes
    - Ensures users can only create/delete their own likes
    - Allows reading of all likes for displaying like counts
    - Maintains data integrity by checking user ownership
*/

-- Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy for creating likes
CREATE POLICY "Users can create their own likes"
ON likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for deleting likes
CREATE POLICY "Users can delete their own likes"
ON likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy for viewing likes
CREATE POLICY "Users can view all likes"
ON likes
FOR SELECT
TO authenticated
USING (true);