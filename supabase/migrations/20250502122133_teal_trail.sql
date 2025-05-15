/*
  # Add RLS policies for votes table

  1. Changes
    - Enable RLS on votes table
    - Add policies to allow authenticated users to:
      - Insert votes
      - Update their own votes
      - Delete their own votes
      - View all votes
    - Policies ensure users can only manage their own votes
    - All authenticated users can view votes for transparency

  2. Security
    - Enables row level security
    - Restricts vote management to vote owners
    - Allows public read access for vote counts
*/

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert votes
CREATE POLICY "Users can create votes"
ON votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to update their own votes
CREATE POLICY "Users can update their own votes"
ON votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes"
ON votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow everyone to view votes
CREATE POLICY "Everyone can view votes"
ON votes
FOR SELECT
TO public
USING (true);