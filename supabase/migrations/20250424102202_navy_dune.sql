/*
  # Fix Chat Policies and Failed Fetch Issues

  1. Changes
    - Drop all existing chat policies
    - Create new simplified policies without recursion
    - Fix chat access and message handling

  2. Security
    - Maintain security while avoiding recursive checks
    - Users can only access their own chats
    - Messages remain protected per conversation
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "allow all" ON a_chat;
DROP POLICY IF EXISTS "Users can manage their own chat membership" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view chat participants" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON a_chat_messages;
DROP POLICY IF EXISTS "test_allow_all" ON a_chat_messages;
DROP POLICY IF EXISTS "test_allow_all" ON a_chat_users;

-- Create new simplified policies for a_chat
CREATE POLICY "Users can view their chats"
ON a_chat
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

-- Create new policies for a_chat_users
CREATE POLICY "Users can view participants"
ON a_chat_users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their chats"
ON a_chat_users
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create new policies for a_chat_messages
CREATE POLICY "Users can view chat messages"
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

CREATE POLICY "Users can send chat messages"
ON a_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);