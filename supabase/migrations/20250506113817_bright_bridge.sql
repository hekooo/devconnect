/*
  # Add is_private column to profiles table

  1. Changes
    - Add `is_private` boolean column to `profiles` table with default value of false
    - This allows users to set their profile as private (only visible to followers)
    - Default is false (public) for backward compatibility

  2. Purpose
    - Enable privacy settings for user profiles
    - Allow users to control who can view their content
    - Maintain existing functionality for users who prefer public profiles
*/

-- Add is_private column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;