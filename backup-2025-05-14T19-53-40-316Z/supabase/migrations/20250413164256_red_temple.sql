/*
  # Add followers table and update profiles

  1. New Tables
    - `followers`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on followers table
    - Add policies for authenticated users
*/

-- Create followers table
CREATE TABLE followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Allow users to see who follows who
CREATE POLICY "Followers are viewable by everyone"
  ON followers
  FOR SELECT
  USING (true);

-- Allow users to follow/unfollow others
CREATE POLICY "Users can manage their own follows"
  ON followers
  FOR ALL
  USING (auth.uid() = follower_id);