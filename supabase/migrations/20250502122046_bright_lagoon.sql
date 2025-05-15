/*
  # Add RLS policies for content_tags table

  1. Changes
    - Enable RLS on content_tags table
    - Add policies to allow:
      - Authenticated users to create content tags
      - Public users to view content tags
      - Users to delete their own content tags

  2. Security
    - Enable RLS for content_tags table
    - Add policy for inserting content tags by authenticated users
    - Add policy for viewing content tags by everyone
    - Add policy for deleting content tags by content owners
*/

-- Enable RLS
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create content tags
CREATE POLICY "Users can create content tags"
ON content_tags
FOR INSERT
TO authenticated
WITH CHECK (
  -- For questions
  (question_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = question_id
    AND questions.user_id = auth.uid()
  ))
  OR
  -- For posts
  (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ))
  OR
  -- For groups
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_id
    AND groups.owner_id = auth.uid()
  ))
);

-- Allow everyone to view content tags
CREATE POLICY "Content tags are viewable by everyone"
ON content_tags
FOR SELECT
TO public
USING (true);

-- Allow users to delete their own content tags
CREATE POLICY "Users can delete their own content tags"
ON content_tags
FOR DELETE
TO authenticated
USING (
  -- For questions
  (question_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = question_id
    AND questions.user_id = auth.uid()
  ))
  OR
  -- For posts
  (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ))
  OR
  -- For groups
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_id
    AND groups.owner_id = auth.uid()
  ))
);