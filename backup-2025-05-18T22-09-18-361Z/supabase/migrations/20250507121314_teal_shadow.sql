/*
  # Add Private Account Support

  1. Changes
    - Add is_private column to profiles table
    - Update RLS policies for posts to respect privacy settings
    - Add policies for profile visibility

  2. Security
    - Private accounts' posts only visible to followers
    - Public profile info remains visible to everyone
*/

-- Add is_private column to profiles
ALTER TABLE profiles
ADD COLUMN is_private boolean DEFAULT false;

-- Update posts policies to respect privacy settings
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable by followers or if account is public"
ON posts
FOR SELECT
USING (
  (
    -- Post is from a public account
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.user_id
      AND profiles.is_private = true
    )
  ) OR (
    -- Post is from a private account but viewer is a follower
    EXISTS (
      SELECT 1 FROM followers
      WHERE followers.following_id = posts.user_id
      AND followers.follower_id = auth.uid()
    )
  ) OR (
    -- User is viewing their own posts
    auth.uid() = user_id
  )
);