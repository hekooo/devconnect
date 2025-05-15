/*
  # Fix follow notification trigger

  1. Changes
    - Drop and recreate the create_follow_notification trigger function to use correct column name
    - Update trigger to use following_id instead of followee_id

  2. Security
    - No changes to RLS policies
    - No changes to table permissions
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_follow_notification CASCADE;

-- Recreate the function with the correct column name
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    actor_id,
    notification_type,
    message
  )
  VALUES (
    NEW.following_id, -- Use following_id instead of followee_id
    NEW.follower_id,
    'follow',
    'started following you'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();