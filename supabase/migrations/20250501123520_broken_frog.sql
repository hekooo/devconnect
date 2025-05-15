-- Drop existing policies and triggers if they exist
DROP POLICY IF EXISTS "Users can view chats they are members of" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can add members to their chats" ON chat_members;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
DROP TRIGGER IF EXISTS update_chat_timestamp ON messages;

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat members table
CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Chat policies
CREATE POLICY "Users can view chats they are members of"
  ON chats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = id AND chat_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (true);

-- Chat members policies
CREATE POLICY "Users can view chat members"
  ON chat_members FOR SELECT
  USING (true);

CREATE POLICY "Users can add members to their chats"
  ON chat_members FOR INSERT
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_id AND chat_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages to their chats"
  ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_id AND chat_members.user_id = auth.uid()
  ));

-- Function to update chat's updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat's timestamp on new message
CREATE TRIGGER update_chat_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamp();