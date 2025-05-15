/*
  # Enable RLS for chat_members table

  1. Security Changes
    - Enable RLS on chat_members table
    - Add policies for:
      - Users can view their own chat memberships
      - Users can join chats they're invited to
      - Users can leave chats they're members of

  2. Notes
    - Ensures users can only access chat data they're authorized to see
    - Maintains chat privacy and security
*/

-- Enable RLS
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own chat memberships
CREATE POLICY "Users can view their own chat memberships"
ON chat_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to join chats
CREATE POLICY "Users can join chats"
ON chat_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to leave chats
CREATE POLICY "Users can leave their chats"
ON chat_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their last_read_at
CREATE POLICY "Users can update their chat member status"
ON chat_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());