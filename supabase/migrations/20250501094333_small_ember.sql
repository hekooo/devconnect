/*
  # Create notifications table and triggers

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `actor_id` (uuid, references profiles)
      - `notification_type` (text)
      - `entity_id` (uuid)
      - `entity_type` (text)
      - `message` (text)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for authenticated users
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  entity_id uuid,
  entity_type text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create notification function and trigger for likes
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    actor_id,
    notification_type,
    entity_id,
    entity_type,
    message
  )
  SELECT
    CASE
      WHEN NEW.post_id IS NOT NULL THEN (SELECT user_id FROM posts WHERE id = NEW.post_id)
      WHEN NEW.comment_id IS NOT NULL THEN (SELECT user_id FROM comments WHERE id = NEW.comment_id)
    END,
    NEW.user_id,
    'like',
    COALESCE(NEW.post_id, NEW.comment_id),
    CASE
      WHEN NEW.post_id IS NOT NULL THEN 'post'
      WHEN NEW.comment_id IS NOT NULL THEN 'comment'
    END,
    'liked your ' || CASE
      WHEN NEW.post_id IS NOT NULL THEN 'post'
      WHEN NEW.comment_id IS NOT NULL THEN 'comment'
    END
  WHERE NEW.user_id != CASE
    WHEN NEW.post_id IS NOT NULL THEN (SELECT user_id FROM posts WHERE id = NEW.post_id)
    WHEN NEW.comment_id IS NOT NULL THEN (SELECT user_id FROM comments WHERE id = NEW.comment_id)
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_like_notification_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

-- Create notification function and trigger for comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    actor_id,
    notification_type,
    entity_id,
    entity_type,
    message
  )
  SELECT
    posts.user_id,
    NEW.user_id,
    'comment',
    NEW.post_id,
    'post',
    'commented on your post'
  FROM posts
  WHERE posts.id = NEW.post_id
  AND NEW.user_id != posts.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

-- Create notification function and trigger for follows
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    actor_id,
    notification_type,
    entity_id,
    entity_type,
    message
  )
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    NEW.following_id,
    'profile',
    'started following you'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_follow_notification_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();