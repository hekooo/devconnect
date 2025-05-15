/*
  # Fix Chat RLS Policies

  1. Changes
    - Update RLS policies for chats table to allow chat creation
    - Add policies for direct and group chat creation
    - Ensure policies check for valid user permissions

  2. Security
    - Enable RLS on chats table
    - Add policies for chat creation and management
    - Maintain existing security constraints
*/

-- First, ensure RLS is enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create direct chats" ON chats;
DROP POLICY IF EXISTS "Users can create group chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their chats" ON chats;
DROP POLICY IF EXISTS "Users can update their chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create comprehensive policies for chat management
CREATE POLICY "Users can create direct chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'direct' AND
  creator_id = auth.uid()
);

CREATE POLICY "Users can create group chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'group' AND
  creator_id = auth.uid()
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

CREATE POLICY "Users can update their own chats"
ON chats
FOR UPDATE
TO authenticated
USING (
  creator_id = auth.uid()
)
WITH CHECK (
  creator_id = auth.uid()
);

CREATE POLICY "Users can delete their own chats"
ON chats
FOR DELETE
TO authenticated
USING (
  creator_id = auth.uid()
);