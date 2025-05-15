/*
  # Add caption position to stories

  1. Changes
    - Add `caption_position` column to `stories` table to store caption positioning data
      - Uses `jsonb` type to store x/y coordinates
      - Nullable since not all stories need captions
      - No default value required

  2. Purpose
    - Enables storing caption positioning information for stories
    - Allows flexible positioning of captions on story media
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stories' 
    AND column_name = 'caption_position'
  ) THEN
    ALTER TABLE stories ADD COLUMN caption_position jsonb;
  END IF;
END $$;