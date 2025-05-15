/*
  # Fix Chat RLS Policies

  1. Changes
    - Update RLS policies for chats table to properly handle direct chat creation
    - Add policies to allow users to create direct chats
    - Add policies to allow users to view their own chats
    - Add policies to allow users to update and delete their own chats

  2. Security
    - Enable RLS on chats table
    - Add policies for authenticated users to:
      - Create direct chats
      - View chats they are members of
      - Update and delete chats they created
*/

-- Drop existing policies to recreate them with correct permissions
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can create direct chats" ON chats;
DROP POLICY IF EXISTS "Users can create group chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their chats" ON chats;
DROP POLICY IF EXISTS "Users can update their chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create new policies with correct permissions
CREATE POLICY "Users can create direct chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'direct' AND creator_id = auth.uid()
);

CREATE POLICY "Users can create group chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'group' AND creator_id = auth.uid()
);

CREATE POLICY "Users can view their chats"
ON chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chats.id
    AND chat_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their chats"
ON chats
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can delete their chats"
ON chats
FOR DELETE
TO authenticated
USING (creator_id = auth.uid());