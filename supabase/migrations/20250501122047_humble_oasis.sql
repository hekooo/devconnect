/*
  # Fix notifications RLS policy

  1. Changes
    - Update RLS policy for notifications table to allow trigger functions to create notifications
    - Add policy to allow users to view their own notifications
    - Add policy to allow users to update their own notifications (e.g., marking as read)

  2. Security
    - Enable RLS on notifications table
    - Add policies to ensure users can only access their own notifications
    - Allow trigger functions to create notifications
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create new policies
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL AND (
    -- Allow trigger functions to create notifications
    current_setting('role')::text = 'rls_restricted' OR
    -- Allow follow notifications to be created directly
    (notification_type = 'follow' AND actor_id = auth.uid() AND entity_type = 'follow')
  )
);

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());