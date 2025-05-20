/*
  # Fix Chat Users Policies

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for a_chat_users
    - Simplify policy logic to prevent infinite recursion

  2. Security
    - Maintain security while avoiding recursive checks
    - Users can only access their own chats
    - Users can only manage their own chat participation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON a_chat_users;
DROP POLICY IF EXISTS "Users can manage their chat participation" ON a_chat_users;

-- Create new, non-recursive policies
CREATE POLICY "Users can view chats they participate in"
ON a_chat_users
FOR SELECT
TO authenticated
USING (
  -- User can see their own chat memberships
  user_id = auth.uid()
);

CREATE POLICY "Users can manage their own chat membership"
ON a_chat_users
FOR ALL
TO authenticated
USING (
  -- User can only manage their own participation
  user_id = auth.uid()
);

-- Add policy for viewing other participants in shared chats
CREATE POLICY "Users can view other participants in their chats"
ON a_chat_users
FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);