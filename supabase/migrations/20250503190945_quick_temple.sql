-- Create story_likes table
CREATE TABLE IF NOT EXISTS story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for story_likes with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'story_likes' 
    AND policyname = 'Users can view story likes'
  ) THEN
    CREATE POLICY "Users can view story likes"
      ON story_likes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'story_likes' 
    AND policyname = 'Users can like stories'
  ) THEN
    CREATE POLICY "Users can like stories"
      ON story_likes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'story_likes' 
    AND policyname = 'Users can unlike stories'
  ) THEN
    CREATE POLICY "Users can unlike stories"
      ON story_likes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure story_views has the right structure and policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'story_views' 
    AND policyname = 'Users can view story view counts'
  ) THEN
    CREATE POLICY "Users can view story view counts"
      ON story_views
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create functions to get story likes and views count
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_story_likes_count'
  ) THEN
    CREATE FUNCTION get_story_likes_count(story_id uuid)
    RETURNS integer
    LANGUAGE sql
    STABLE
    AS $func$
      SELECT COUNT(*)::integer FROM story_likes WHERE story_id = $1;
    $func$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_story_views_count'
  ) THEN
    CREATE FUNCTION get_story_views_count(story_id uuid)
    RETURNS integer
    LANGUAGE sql
    STABLE
    AS $func$
      SELECT COUNT(*)::integer FROM story_views WHERE story_id = $1;
    $func$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_user_liked_story'
  ) THEN
    CREATE FUNCTION has_user_liked_story(story_id uuid, user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM story_likes 
        WHERE story_id = $1 AND user_id = $2
      );
    $func$;
  END IF;
END $$;