/*
  # Fix tags column in posts table

  1. Changes
    - Ensure tags column exists in posts table with correct type
    - Add index for faster tag searches
    
  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Adds GIN index for efficient array operations
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE posts ADD COLUMN tags text[];
  END IF;
END $$;

-- Add GIN index for efficient tag searches if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING gin (tags);

-- Notify Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';