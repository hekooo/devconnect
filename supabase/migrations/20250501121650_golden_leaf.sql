/*
  # Fix notifications RLS policy

  1. Changes
    - Update RLS policy for notifications table to allow trigger functions to create notifications
    - Add policy to allow authenticated users to create notifications when following/unfollowing

  2. Security
    - Maintain existing RLS policies for notifications
    - Add specific policy for follow notifications
    - Ensure only authenticated users can create notifications
*/

-- Drop existing policy for trigger functions
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;

-- Create updated policy for trigger functions
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NOT NULL) AND 
  (
    -- Allow trigger functions to create notifications
    current_setting('role'::text) = 'rls_restricted'::text
    OR
    -- Allow users to create follow notifications
    (
      notification_type = 'follow' AND
      actor_id = auth.uid() AND
      entity_type = 'follow'
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;