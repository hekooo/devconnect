/*
  # Fix comments table RLS policies

  1. Changes
    - Enable RLS on comments table
    - Add policies for:
      - Public viewing of comments
      - Authenticated users creating comments
      - Users updating their own comments
      - Users deleting their own comments
*/

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view comments
CREATE POLICY "Comments are viewable by everyone"
ON comments FOR SELECT
TO public
USING (true);

-- Allow authenticated users to create comments
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);