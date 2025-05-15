/*
  # Fix chat member policies to prevent infinite recursion

  1. Changes
    - Remove recursive policies that cause infinite loops
    - Simplify chat member access policies
    - Add proper authentication checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can add members to their chats" ON chat_members;

-- Create new non-recursive policies
CREATE POLICY "Users can view chat members"
  ON chat_members
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add members to chats"
  ON chat_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add members if they are authenticated
    auth.uid() IS NOT NULL AND
    -- Ensure the chat exists
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;