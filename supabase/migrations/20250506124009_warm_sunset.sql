-- Add notification_settings column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_settings jsonb DEFAULT jsonb_build_object(
      'email_notifications', true,
      'notification_types', jsonb_build_object(
        'likes', true,
        'comments', true,
        'follows', true,
        'mentions', true
      )
    );
  END IF;
END $$;

-- Create function to send email notifications
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_settings jsonb;
  notification_type text;
  email_enabled boolean;
  notification_type_enabled boolean;
BEGIN
  -- Get the user's email and notification settings
  SELECT email, profiles.notification_settings INTO user_email, user_settings
  FROM auth.users
  JOIN profiles ON auth.users.id = profiles.id
  WHERE profiles.id = NEW.user_id;
  
  -- Check if email notifications are enabled
  email_enabled := (user_settings->>'email_notifications')::boolean;
  
  -- Get notification type
  notification_type := NEW.notification_type;
  
  -- Check if this type of notification is enabled
  notification_type_enabled := (user_settings->'notification_types'->notification_type)::boolean;
  
  -- Send email if notifications are enabled for this type
  IF email_enabled AND notification_type_enabled THEN
    -- In a real implementation, this would call an external email service
    -- For now, we'll just log the email that would be sent
    RAISE NOTICE 'Sending email to %: %', user_email, NEW.message;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to send email notifications
DROP TRIGGER IF EXISTS send_notification_email_trigger ON notifications;
CREATE TRIGGER send_notification_email_trigger
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION send_notification_email();

-- Add creator_id to chats table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN creator_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Fix notification policies to ensure they can be properly displayed
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
  
  -- Create new policy for viewing notifications
  CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
END $$;

-- Create function to increment follower and following counts
CREATE OR REPLACE FUNCTION increment_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment follower count for the user being followed
  UPDATE profiles
  SET follower_count = follower_count + 1
  WHERE id = NEW.following_id;
  
  -- Increment following count for the follower
  UPDATE profiles
  SET following_count = following_count + 1
  WHERE id = NEW.follower_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement follower and following counts
CREATE OR REPLACE FUNCTION decrement_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement follower count for the user being unfollowed
  UPDATE profiles
  SET follower_count = GREATEST(0, follower_count - 1)
  WHERE id = OLD.following_id;
  
  -- Decrement following count for the follower
  UPDATE profiles
  SET following_count = GREATEST(0, following_count - 1)
  WHERE id = OLD.follower_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for follower count updates
DROP TRIGGER IF EXISTS increment_follower_count_trigger ON follows;
CREATE TRIGGER increment_follower_count_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION increment_follower_count();

DROP TRIGGER IF EXISTS decrement_follower_count_trigger ON follows;
CREATE TRIGGER decrement_follower_count_trigger
AFTER DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION decrement_follower_count();

-- Create function to update follow stats
CREATE OR REPLACE FUNCTION update_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the follower
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the follower
    UPDATE profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow stats updates
DROP TRIGGER IF EXISTS update_follow_stats_trigger ON follows;
CREATE TRIGGER update_follow_stats_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follow_stats();

-- Create function to update post count
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET post_count = post_count + 1
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post count updates
DROP TRIGGER IF EXISTS trigger_update_post_count ON posts;
CREATE TRIGGER trigger_update_post_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_count();

-- Create function to update question count
CREATE OR REPLACE FUNCTION update_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET question_count = question_count + 1
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET question_count = GREATEST(0, question_count - 1)
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for question count updates
DROP TRIGGER IF EXISTS trigger_update_question_count ON questions;
CREATE TRIGGER trigger_update_question_count
AFTER INSERT OR DELETE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_question_count();