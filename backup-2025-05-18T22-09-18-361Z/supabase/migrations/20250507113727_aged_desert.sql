/*
  # Fix Chat RLS Policies

  1. Changes
    - Drop and recreate all chat-related policies
    - Add UPDATE policy for a_chat table
    - Fix INSERT policy for a_chat table
    - Ensure proper chat access control

  2. Security
    - Maintain data access security
    - Allow authenticated users to create and manage chats
    - Keep messages protected per conversation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create chats" ON a_chat;
DROP POLICY IF EXISTS "Users can view their chats" ON a_chat;
DROP POLICY IF EXISTS "Users can update their chats" ON a_chat;

-- Create new policies for a_chat table
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
)
WITH CHECK (true);

-- Ensure a_chat has RLS enabled
ALTER TABLE a_chat ENABLE ROW LEVEL SECURITY;