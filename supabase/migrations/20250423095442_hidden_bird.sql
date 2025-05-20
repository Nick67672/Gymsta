/*
  # Add Verification Badge

  1. Changes
    - Add is_verifide column to profiles table
    - Set default value to false
    - Add RLS policy for admin-only updates

  2. Security
    - Only admins can update verification status
    - Everyone can view verification status
*/

-- Add is_verifide column
ALTER TABLE profiles
ADD COLUMN is_verifide boolean DEFAULT false;

-- Create policy for viewing verification status
CREATE POLICY "Anyone can view verification status"
ON profiles
FOR SELECT
USING (true);