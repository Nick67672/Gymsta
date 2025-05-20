/*
  # Add Gym Field to Profiles

  1. Changes
    - Add gym field to profiles table
    - Make it optional (nullable)
    - Add it to existing RLS policies

  2. Security
    - Maintain existing RLS policies
    - Users can still update their own profiles
*/

-- Add gym column to profiles table if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gym text;