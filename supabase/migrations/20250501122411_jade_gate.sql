/*
  # Fix notification RLS policies

  1. Changes
    - Drop existing notification policies
    - Create comprehensive insert policy that handles both trigger and direct notifications
    - Ensure proper RLS for viewing and updating notifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow trigger functions to create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create new insert policy that handles both trigger-created notifications and direct notifications
CREATE POLICY "Allow notifications to be created"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow trigger functions to create notifications
  (current_setting('role'::text, true) = 'rls_restricted'::text)
  OR
  -- Allow users to create notifications where they are the actor
  (
    auth.uid() = actor_id
    AND
    user_id IS NOT NULL
  )
);

-- Policy for viewing notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy for updating notifications
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;