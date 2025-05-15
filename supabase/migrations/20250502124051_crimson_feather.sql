/*
  # Add RLS policies for question and answer management

  1. Changes
    - Add policies for question editing and deletion
    - Add policies for answer editing and deletion
    - Allow question owners to delete any answer on their questions
*/

-- Update question policies to allow editing and deletion
CREATE POLICY "Users can update their own questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON questions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update answer policies to allow question owners to delete answers
CREATE POLICY "Question owners can delete answers"
  ON answers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      WHERE questions.id = answers.question_id
      AND questions.user_id = auth.uid()
    )
  );