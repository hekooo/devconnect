/*
  # Fix notification RLS policy for follow notifications
  
  1. Security Changes
    - Update notification policy to allow trigger-created notifications
    - Add policy for follow notifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;

-- Create new policy for notifications
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL AND (
    -- Allow notifications created by trigger functions
    current_setting('role'::text) = 'rls_restricted' OR
    -- Allow follow notifications
    (notification_type = 'follow' AND actor_id = auth.uid() AND entity_type = 'follow')
  )
);