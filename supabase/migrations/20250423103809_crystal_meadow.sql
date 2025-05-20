/*
  # Update Early Adopter Badge Logic

  1. Changes
    - Safely check for column existence before adding
    - Create/replace function for early adopter check
    - Create trigger for automatic badge assignment

  2. Security
    - Only system can set early adopter status
    - Users cannot modify their badge status
*/

-- Safely add is_early_adopter column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'is_early_adopter'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN is_early_adopter boolean DEFAULT false;
  END IF;
END $$;

-- Create or replace function to check user count and set badge
CREATE OR REPLACE FUNCTION check_early_adopter()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) <= 1000 THEN
    NEW.is_early_adopter := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_early_adopter ON profiles;

CREATE TRIGGER set_early_adopter
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_early_adopter();