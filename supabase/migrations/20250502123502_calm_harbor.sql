/*
  # Add RLS policies for answers table

  1. Security Changes
    - Enable RLS on answers table
    - Add policies for:
      - Viewing answers (all authenticated users)
      - Creating answers (authenticated users)
      - Updating answers (answer author only)
      - Deleting answers (answer author only)
*/

-- Enable RLS
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view answers
CREATE POLICY "Anyone can view answers"
  ON answers
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create answers
CREATE POLICY "Users can create answers"
  ON answers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own answers
CREATE POLICY "Users can update own answers"
  ON answers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own answers
CREATE POLICY "Users can delete own answers"
  ON answers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);