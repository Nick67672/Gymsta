/*
  # Fix Chat RLS Policies

  1. Changes
    - Drop existing problematic policies
    - Create new comprehensive policies for chat tables
    - Fix chat message access and creation permissions

  2. Security
    - Maintain data access security
    - Allow authenticated users to create and access chats
    - Ensure proper message permissions
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create chats" ON a_chat;
DROP POLICY IF EXISTS "Users can view their chats" ON a_chat;
DROP POLICY IF EXISTS "Users can view chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON a_chat_messages;

-- Create comprehensive policies for a_chat table
CREATE POLICY "Users can create chats"
ON a_chat
FOR INSERT
TO authenticated
WITH CHECK (true);

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

-- Update policies for a_chat_messages
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

-- Add policy for updating chats
CREATE POLICY "Users can update their chats"
ON a_chat
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);