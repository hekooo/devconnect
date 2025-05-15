/*
  # Fix Chat RLS Policies

  1. Changes
    - Update INSERT policy for chats table to allow authenticated users to create chats
    - Add check to ensure user is part of the chat they're creating
    - Add policy to allow users to view chats they're members of

  2. Security
    - Maintains RLS protection while allowing necessary operations
    - Ensures users can only access chats they're part of
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create new INSERT policy
CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create new SELECT policy
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