/*
  # Fix chat RLS policies

  1. Changes
    - Drop existing chat policies
    - Create new policies for chat creation and access
    - Ensure authenticated users can create chats
    - Ensure users can view chats they're members of
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "chat_members_insert_policy" ON chat_members;
DROP POLICY IF EXISTS "chat_members_select_policy" ON chat_members;

-- Create new policies for chats
CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view chats they are members of"
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

-- Create new policies for chat members
CREATE POLICY "chat_members_insert_policy"
ON chat_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "chat_members_select_policy"
ON chat_members
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;