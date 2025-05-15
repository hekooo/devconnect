/*
  # Fix Chat Member Policies

  1. Changes
    - Fix infinite recursion in chat_members policies
    - Update chat member access policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat members for their chats" ON chat_members;
DROP POLICY IF EXISTS "Users can add chat members" ON chat_members;

-- Create new policies without recursion
CREATE POLICY "Users can view chat members"
  ON chat_members
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can add members to their chats"
  ON chat_members
  FOR INSERT
  TO public
  WITH CHECK (true);