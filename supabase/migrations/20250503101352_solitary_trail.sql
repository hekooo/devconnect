/*
  # Fix follow notification trigger function

  1. Changes
    - Update create_follow_notification function to use correct field name
    - Drop and recreate trigger to ensure clean state

  2. Details
    - Replace 'followee_id' with 'following_id' in notification creation
    - Maintain existing notification type and message format
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS create_follow_notification_trigger ON follows;

-- Update the function to use correct field names
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
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();