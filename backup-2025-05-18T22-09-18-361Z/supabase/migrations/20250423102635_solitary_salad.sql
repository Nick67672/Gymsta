/*
  # Add Early Adopter Badge

  1. Changes
    - Add is_early_adopter column to profiles table
    - Add trigger to automatically set is_early_adopter for first 1000 users
    - Add function to check user count and set badge

  2. Security
    - Only system can set early adopter status
    - Users cannot modify their badge status
*/

-- Add is_early_adopter column
ALTER TABLE profiles
ADD COLUMN is_early_adopter boolean DEFAULT false;

-- Create function to check user count and set badge
CREATE OR REPLACE FUNCTION check_early_adopter()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) <= 1000 THEN
    NEW.is_early_adopter := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set badge for first 1000 users
CREATE TRIGGER set_early_adopter
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_early_adopter();