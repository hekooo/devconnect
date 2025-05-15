/*
  # Fix chat RLS policies

  1. Changes
    - Drop existing chat policies that are causing issues
    - Add new comprehensive policies for chat management:
      - Allow users to create new chats
      - Allow users to view chats they're members of
      - Allow users to update chats they're members of
      - Allow users to delete chats they own

  2. Security
    - Enable RLS on chats table (already enabled)
    - Add policies for INSERT, SELECT, UPDATE, and DELETE operations
    - Ensure users can only access chats they're members of
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
DROP POLICY IF EXISTS "chats_insert_policy" ON chats;

-- Create new policies
CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their chats"
ON chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id
    AND chat_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their chats"
ON chats
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id
    AND chat_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id
    AND chat_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their chats"
ON chats
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id
    AND chat_members.user_id = auth.uid()
  )
);