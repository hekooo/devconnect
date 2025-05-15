/*
  # Fix Bookmarks RLS Policies

  1. Changes
    - Add proper RLS policies for bookmarks table
    - Enable RLS on bookmarks table
    - Add policies for CRUD operations

  2. Security
    - Users can only view their own bookmarks
    - Users can only create bookmarks for themselves
    - Users can only delete their own bookmarks
*/

-- Enable RLS on bookmarks table (if not already enabled)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

-- Create new policies
CREATE POLICY "Users can view their own bookmarks"
ON bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);