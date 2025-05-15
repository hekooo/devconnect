/*
  # Add likes policy if not exists

  1. Security
    - Add INSERT policy for likes table if it doesn't exist
    - Allow authenticated users to create their own likes
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'likes' 
    AND policyname = 'Users can create their own likes'
  ) THEN
    CREATE POLICY "Users can create their own likes"
    ON public.likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;