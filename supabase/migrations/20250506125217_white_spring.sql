/*
  # Fix Chat RLS Policies

  1. Changes
    - Update RLS policies for chats table to allow authenticated users to create chats
    - Add policy for direct chat creation
    - Add policy for group chat creation
    - Add policy for chat deletion
    - Add policy for chat updates

  2. Security
    - Enable RLS on chats table (already enabled)
    - Policies ensure users can only:
      - Create chats where they are the creator
      - View chats they are members of
      - Delete chats they created
      - Update chats they created
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON chats;
DROP POLICY IF EXISTS "authenticated_users_can_create_chats" ON chats;
DROP POLICY IF EXISTS "Can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
DROP POLICY IF EXISTS "users_can_view_their_chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their chats" ON chats;
DROP POLICY IF EXISTS "Users can update their chats" ON chats;

-- Create new policies
CREATE POLICY "Users can create direct chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'direct' 
  AND creator_id = auth.uid()
);

CREATE POLICY "Users can create group chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'group' 
  AND creator_id = auth.uid()
);

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

CREATE POLICY "Users can delete their chats"
ON chats
FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Users can update their chats"
ON chats
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());