/*
  # Delete All Question Posts

  1. Changes
    - Delete all records from the questions table
    - Delete related data in answers, votes, and content_tags tables
    - Maintain referential integrity using cascading deletes

  2. Security
    - Uses transaction to ensure atomicity
    - Preserves database integrity with proper order of operations
*/

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- First, delete all content_tags related to questions
-- This is necessary because content_tags has a foreign key to questions
DELETE FROM content_tags
WHERE question_id IS NOT NULL;

-- Delete all votes related to questions
-- This is necessary because votes has a foreign key to questions
DELETE FROM votes
WHERE question_id IS NOT NULL;

-- Delete all answers
-- This will cascade to votes on answers due to the ON DELETE CASCADE constraint
DELETE FROM answers;

-- Finally, delete all questions
DELETE FROM questions;

-- Commit the transaction
COMMIT;