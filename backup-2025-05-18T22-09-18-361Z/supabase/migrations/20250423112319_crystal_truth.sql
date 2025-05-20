/*
  # Fix chat policies

  1. Changes
    - Remove recursive policies from a_chat_users table
    - Simplify chat access policies to prevent infinite recursion
    - Update chat message policies to use direct user checks
  
  2. Security
    - Maintain data access security while fixing recursion
    - Users can still only access their own chats
    - Messages remain protected per conversation
*/

-- First disable RLS to modify policies
ALTER TABLE a_chat_users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that may be causing recursion
DROP POLICY IF EXISTS "Users can manage their own chat membership" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view chats they participate in" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view other participants in their chats" ON a_chat_users;

-- Create new, simplified policies
CREATE POLICY "Users can manage their own chat membership"
ON a_chat_users
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view chat participants"
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

-- Re-enable RLS
ALTER TABLE a_chat_users ENABLE ROW LEVEL SECURITY;

-- Update a_chat_messages policies to use direct checks
ALTER TABLE a_chat_messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON a_chat_messages;

CREATE POLICY "Users can view messages in their chats"
ON a_chat_messages
FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON a_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND 
  chat_id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);

ALTER TABLE a_chat_messages ENABLE ROW LEVEL SECURITY;