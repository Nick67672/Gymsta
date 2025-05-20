/*
  # Fix Stories Table Schema

  1. Changes
    - Drop existing stories table
    - Recreate stories table with UUID primary key
    - Update RLS policies
    - Keep storage policies unchanged

  2. Security
    - Maintain existing security policies
    - Ensure proper user access control
*/

-- Drop existing table
DROP TABLE IF EXISTS stories;

-- Create stories table with UUID primary key
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own stories"
ON stories
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view stories"
ON stories
FOR SELECT
TO public
USING (true);