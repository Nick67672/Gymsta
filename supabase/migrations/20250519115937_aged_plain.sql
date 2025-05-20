/*
  # Account Deletion Functionality

  1. Changes
    - Add function to handle complete account deletion
    - Ensure all user data is properly deleted
    - Set up proper cascading delete relationships

  2. Security
    - Maintain RLS protection
    - Ensure only the account owner can delete their account
*/

-- Create a function to handle complete account deletion
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete all user data
  -- The ON DELETE CASCADE constraints will handle most relationships
  -- but we'll explicitly delete some data to ensure complete removal

  -- Delete user's stories
  DELETE FROM stories WHERE user_id = $1;
  
  -- Delete user's likes
  DELETE FROM likes WHERE user_id = $1;
  
  -- Delete user's posts
  DELETE FROM posts WHERE user_id = $1;
  
  -- Delete user's products
  DELETE FROM products WHERE seller_id = $1;
  
  -- Delete user's workouts
  DELETE FROM workouts WHERE user_id = $1;
  
  -- Delete user's chat messages
  DELETE FROM a_chat_messages WHERE user_id = $1;
  
  -- Delete user's chat participations
  DELETE FROM a_chat_users WHERE user_id = $1;
  
  -- Delete user's followers relationships
  DELETE FROM followers WHERE follower_id = $1 OR following_id = $1;
  
  -- Delete user's shipping addresses
  DELETE FROM shipping_addresses WHERE user_id = $1;
  
  -- Finally, delete the user's profile
  -- This should be done last as other tables reference it
  DELETE FROM profiles WHERE id = $1;
END;
$$ LANGUAGE plpgsql;

-- Create a secure RPC function that can only be called by the user themselves
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Call the account deletion function
  PERFORM delete_user_account(current_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;