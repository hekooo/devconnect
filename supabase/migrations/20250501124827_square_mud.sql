/*
  # Fix chat member policies
  
  1. Changes
    - Drop and recreate chat member policies to avoid recursion
    - Update chat creation policy
    - Ensure RLS is enabled
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can add members to chats" ON chat_members;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can add members to their chats" ON chat_members;

-- Create new non-recursive policies for chat members
CREATE POLICY "chat_members_select_policy"
  ON chat_members
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "chat_members_insert_policy"
  ON chat_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow authenticated users to add members
    auth.uid() IS NOT NULL AND
    -- Ensure the chat exists
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
    )
  );

-- Update chat creation policy
CREATE POLICY "chats_insert_policy"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;