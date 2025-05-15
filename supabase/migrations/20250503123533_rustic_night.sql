/*
  # Add is_deleted column to messages table

  1. Changes
    - Add `is_deleted` boolean column to `messages` table with default value of false
    - Make the column nullable to maintain compatibility with existing records
    - Add comment explaining the purpose of the column

  2. Purpose
    - Enable message recall/unsend functionality
    - Allow messages to be marked as deleted without actually removing them from the database
    - Maintain chat history integrity while supporting user privacy
*/

-- Add is_deleted column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add comment to explain column purpose
COMMENT ON COLUMN messages.is_deleted IS 'Indicates if a message has been recalled/unsent by the sender';