/*
  # Fix follows trigger functions

  1. Changes
    - Update trigger functions to use correct field name `following_id` instead of `followee_id`
    - Recreate affected triggers with correct field references
  
  2. Details
    - Fixes error in notify_user_on_follow function
    - Fixes error in create_follow_notification function
    - Ensures consistent field naming across all follow-related functions
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_follow_insert ON follows;
DROP TRIGGER IF EXISTS create_follow_notification_trigger ON follows;

-- Recreate the notify_user_on_follow function with correct field name
CREATE OR REPLACE FUNCTION notify_user_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, notification_type, message)
  VALUES (
    NEW.following_id,  -- Use following_id instead of followee_id
    NEW.follower_id,
    'follow',
    'started following you'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the create_follow_notification function with correct field name
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
    NEW.following_id,  -- Use following_id instead of followee_id
    NEW.follower_id,
    'follow',
    'started following you'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers
CREATE TRIGGER on_follow_insert
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_follow();

CREATE TRIGGER create_follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();