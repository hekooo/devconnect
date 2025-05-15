/*
  # Fix chats table RLS policies

  1. Changes
    - Update RLS policies for chats table to allow:
      - Users to create chats where they are the creator
      - Users to view chats where they are a member
      - Users to update chats where they are the creator
      - Users to delete chats where they are the creator

  2. Security
    - Enable RLS on chats table
    - Add policies for CRUD operations
    - Ensure users can only access chats they are part of
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create direct chats" ON chats;
DROP POLICY IF EXISTS "Users can create group chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users to create chats"
ON chats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Enable select for users to view their chats"
ON chats FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id
    AND chat_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for users to modify their chats"
ON chats FOR UPDATE TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Enable delete for users to remove their chats"
ON chats FOR DELETE TO authenticated
USING (auth.uid() = creator_id);