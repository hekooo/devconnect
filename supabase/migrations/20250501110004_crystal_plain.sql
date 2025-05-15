/*
  # Create job posts table

  1. New Tables
    - `job_posts` - For storing job and internship opportunities
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `company` (text)
      - `location` (text)
      - `type` (text: full-time, part-time, contract, internship)
      - `description` (text)
      - `requirements` (text[])
      - `salary_range` (text)
      - `tech_stack` (text[])
      - `apply_url` (text)
      - `deadline` (timestamptz)
      - `is_remote` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for job post access and creation
*/

-- Create job posts table
CREATE TABLE IF NOT EXISTS job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  type text NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
  description text NOT NULL,
  requirements text[],
  salary_range text,
  tech_stack text[],
  apply_url text NOT NULL,
  deadline timestamptz NOT NULL,
  is_remote boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Job posts are viewable by everyone"
  ON job_posts
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create job posts"
  ON job_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job posts"
  ON job_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job posts"
  ON job_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_post_updated_at
  BEFORE UPDATE ON job_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_job_post_updated_at();