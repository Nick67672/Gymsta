/*
  # Fix delete_my_account function

  1. Changes
    - Drop existing delete_my_account function
    - Create new delete_my_account function with explicit table references
    - Ensure proper cascade deletion of user data

  2. Security
    - Function remains accessible only to authenticated users
    - Maintains data integrity during deletion
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_my_account();

-- Create new function with explicit table references
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's profile and related data (will cascade to other tables)
  DELETE FROM profiles
  WHERE profiles.id = auth.uid();

  -- Delete the user's auth account
  DELETE FROM auth.users
  WHERE auth.users.id = auth.uid();
END;
$$;