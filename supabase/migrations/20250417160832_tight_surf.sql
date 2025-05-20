/*
  # Configure Stories Table Policies

  1. Changes
    - Enable RLS for stories table
    - Add RLS policies for story management
    - Skip storage policies since they already exist

  2. Security
    - Allow authenticated users to create their own stories
    - Allow public access to view stories
    - Restrict story deletion to owners
*/

-- Enable RLS for stories table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'stories' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
  DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
  DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
END $$;

-- Create policies
CREATE POLICY "Users can create their own stories"
ON stories
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stories are viewable by everyone"
ON stories
FOR SELECT TO public
USING (true);

CREATE POLICY "Users can delete their own stories"
ON stories
FOR DELETE TO authenticated
USING (auth.uid() = user_id);