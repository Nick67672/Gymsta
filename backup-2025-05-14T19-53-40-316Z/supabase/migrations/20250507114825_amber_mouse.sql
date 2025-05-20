/*
  # Fix RLS policies for chat users

  1. Changes
    - Enable RLS on a_chat_users table
    - Add policy for users to insert themselves into chats
    - Add policy for users to view chats they're part of
    - Add policy for users to delete themselves from chats

  2. Security
    - Users can only add themselves to chats
    - Users can only view chats they're part of
    - Users can only remove themselves from chats
*/

-- Enable RLS
ALTER TABLE a_chat_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their chats" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view participants" ON a_chat_users;

-- Create new policies
CREATE POLICY "Users can insert themselves into chats"
ON a_chat_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert rows where user_id matches their auth ID
  auth.uid() = user_id
);

CREATE POLICY "Users can view chats they participate in"
ON a_chat_users
FOR SELECT
TO authenticated
USING (
  -- User can view any chat they're a participant in
  chat_id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove themselves from chats"
ON a_chat_users
FOR DELETE
TO authenticated
USING (
  -- User can only delete their own chat participation
  user_id = auth.uid()
);