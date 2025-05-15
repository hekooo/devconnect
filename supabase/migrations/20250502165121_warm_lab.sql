/*
  # Add RLS policies for comments table with existence checks

  1. Security
    - Enable RLS on comments table
    - Add policies for viewing, creating, updating, and deleting comments
    - Check if policies already exist before creating them
*/

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies with existence checks
DO $$ 
BEGIN
  -- Policy for viewing comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'Comments are viewable by everyone'
  ) THEN
    CREATE POLICY "Comments are viewable by everyone"
      ON comments
      FOR SELECT
      TO public
      USING (true);
  END IF;

  -- Policy for creating comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'Users can create comments'
  ) THEN
    CREATE POLICY "Users can create comments"
      ON comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for updating comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments"
      ON comments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for deleting comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments"
      ON comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;