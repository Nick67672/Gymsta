-- Drop the is_verifide column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'is_verifide'
  ) THEN
    ALTER TABLE profiles DROP COLUMN is_verifide;
  END IF;
END $$;

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Anyone can view verification status" ON profiles;