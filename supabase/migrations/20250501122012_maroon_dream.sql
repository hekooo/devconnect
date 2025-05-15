/*
  # Fix notification RLS policy for follows

  1. Changes
    - Update notification insert policy to allow trigger-created notifications
    - Add specific policy for follow notifications
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;

-- Create new insert policy that handles both trigger-created notifications and follow notifications
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL AND (
    -- Allow notifications created by trigger functions
    current_setting('role'::text) = 'rls_restricted'::text
    OR
    -- Allow follow notifications to be created directly
    (
      notification_type = 'follow' AND
      actor_id = auth.uid() AND
      entity_type = 'follow'
    )
  )
);