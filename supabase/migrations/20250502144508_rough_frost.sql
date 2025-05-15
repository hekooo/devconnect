/*
  # Add tags column to posts table

  1. Changes
    - Add `tags` column to `posts` table as TEXT[] to store multiple tags
    - This allows storing an array of tag strings directly in the posts table
    - Existing posts will have NULL for tags by default

  2. Security
    - No additional RLS policies needed as we're just adding a column
    - Existing post table policies will cover the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE posts ADD COLUMN tags TEXT[];
  END IF;
END $$;