/*
  # Fix chat RLS policies

  1. Changes
    - Drop existing policies that might conflict
    - Create simplified policies for chat creation and viewing
    - Add proper policies for chat members
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "chat_members_insert_policy" ON chat_members;
DROP POLICY IF EXISTS "chat_members_select_policy" ON chat_members;

-- Create simplified policies for chats
CREATE POLICY "authenticated_users_can_create_chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_can_view_their_chats"
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

-- Create policies for chat members
CREATE POLICY "authenticated_users_can_add_chat_members"
ON chat_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users_can_view_chat_members"
ON chat_members
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;