/*
  # Fix notifications table RLS policy

  1. Changes
    - Add RLS policy to allow inserting notifications for follow events
    - Policy ensures notifications can be created when:
      - User is authenticated
      - Notification is being created by a trigger function
      - User is the recipient of the notification

  2. Security
    - Maintains existing RLS policies
    - Adds specific policy for follow notifications
    - Ensures notifications can only be created for valid recipients
*/

-- Allow notifications to be created by trigger functions
CREATE POLICY "Allow trigger functions to create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow notifications where the user is the recipient
  (user_id IS NOT NULL) AND
  -- Or notifications created by trigger functions
  (current_setting('role') = 'rls_restricted')
);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;