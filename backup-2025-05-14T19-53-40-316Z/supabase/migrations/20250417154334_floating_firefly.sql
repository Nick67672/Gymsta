/*
  # Add Stories Table

  1. New Tables
    - `stories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `media_url` (text)
      - `media_type` (text)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)

  2. Security
    - Enable RLS on stories table
    - Add policies for authenticated users
*/

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Allow users to view all stories
CREATE POLICY "Stories are viewable by everyone"
  ON stories
  FOR SELECT
  USING (true);

-- Allow users to create their own stories
CREATE POLICY "Users can create their own stories"
  ON stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own stories
CREATE POLICY "Users can delete their own stories"
  ON stories
  FOR DELETE
  USING (auth.uid() = user_id);