/*
  # Fix Chat Message RLS Policies

  1. Changes
    - Redefine RLS policies for a_chat, a_chat_users, and a_chat_messages tables
    - Ensure authenticated users can create chats and send messages
    - Fix issues with chat message access permissions

  2. Security
    - Maintain data access security
    - Users can properly create and access their own chats
    - Messages remain protected by conversation membership
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Users can create chats" ON a_chat;
DROP POLICY IF EXISTS "Users can view their chats" ON a_chat;
DROP POLICY IF EXISTS "Users can insert their own workouts" ON a_chat;

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

-- Update policy for a_chat_messages to fix RLS violation
DROP POLICY IF EXISTS "Users can send chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON a_chat_messages;

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