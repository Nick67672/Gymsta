-- Add is_reported column to profiles table
ALTER TABLE profiles ADD COLUMN is_reported boolean DEFAULT false;

-- Create index for performance
CREATE INDEX idx_profiles_is_reported ON profiles(is_reported);

-- Add RLS policy for updating is_reported field
-- Only authenticated users can update the is_reported status of other users (not their own)
CREATE POLICY "Users can report other users"
  ON profiles
  FOR UPDATE
  USING (auth.uid() != id)
  WITH CHECK (auth.uid() != id); 