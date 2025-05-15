-- Add new columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add constraint to ensure chat_id is not null
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_chatid_not_null' 
    AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_chatid_not_null CHECK (chat_id IS NOT NULL);
  END IF;
END $$;

-- Update RLS policies to include new columns
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
  DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
  
  -- Recreate policies
  CREATE POLICY "Users can view messages in their chats"
    ON messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.chat_id = messages.chat_id
      AND chat_members.user_id = auth.uid()
    ));

  CREATE POLICY "Users can send messages to their chats"
    ON messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM chat_members
        WHERE chat_members.chat_id = messages.chat_id
        AND chat_members.user_id = auth.uid()
      )
    );
END $$;