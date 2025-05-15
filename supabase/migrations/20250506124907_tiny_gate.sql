/*
  # Fix chat and follows relationships

  1. Changes
    - Add missing foreign key constraints for follows table
    - Enable RLS on chats table
    - Add RLS policies for chats table

  2. Security
    - Enable RLS on chats table
    - Add policies for chat access control
*/

-- Enable RLS on chats table (it was disabled according to schema)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for chats
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

CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Add missing foreign key constraints for follows table
DO $$ 
BEGIN
  -- Only add if they don't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'follows_follower_id_fkey'
  ) THEN
    ALTER TABLE follows
    ADD CONSTRAINT follows_follower_id_fkey
    FOREIGN KEY (follower_id) 
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'follows_following_id_fkey'
  ) THEN
    ALTER TABLE follows
    ADD CONSTRAINT follows_following_id_fkey
    FOREIGN KEY (following_id) 
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;