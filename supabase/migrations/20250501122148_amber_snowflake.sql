/*
  # Fix notifications RLS policy

  1. Changes
    - Update RLS policy for notifications table to allow trigger functions to create notifications
    - Add explicit check for trigger function context in RLS policy

  2. Security
    - Maintains existing security while allowing system-generated notifications
    - Ensures only authenticated users can view their own notifications
    - Allows trigger functions to create notifications on behalf of the system
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;

-- Create new insert policy that properly handles trigger functions
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserts when the user is creating their own notification
  (user_id = auth.uid() AND actor_id = auth.uid())
  OR
  -- Allow inserts from trigger functions
  (
    current_setting('role'::text, true) = 'rls_restricted'
    OR
    -- Specific allowance for follow notifications from the follow trigger
    (
      notification_type = 'follow' 
      AND actor_id = auth.uid()
      AND entity_type = 'follow'
    )
  )
);