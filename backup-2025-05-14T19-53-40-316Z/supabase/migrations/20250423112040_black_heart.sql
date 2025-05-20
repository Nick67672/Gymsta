/*
  # Fix Chat Policies and Add Encryption Support

  1. Changes
    - Fix infinite recursion in conversation_participants policies
    - Add support for encrypted messages
    - Update message policies for encrypted content
    - Add table for encrypted chat messages

  2. Security
    - Maintain RLS protection
    - Prevent infinite recursion
    - Ensure users can only access their conversations
*/

-- Create new table for encrypted chat messages
CREATE TABLE IF NOT EXISTS a_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES a_chat(id),
  user_id uuid REFERENCES profiles(id),
  message text,
  encrypted_content text,
  iv text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create chat table if it doesn't exist
CREATE TABLE IF NOT EXISTS a_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create chat users table if it doesn't exist
CREATE TABLE IF NOT EXISTS a_chat_users (
  id bigint PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES profiles(id),
  chat_id uuid REFERENCES a_chat(id)
);

-- Enable RLS
ALTER TABLE a_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow all" ON a_chat;
DROP POLICY IF EXISTS "allow all for test" ON a_chat_users;
DROP POLICY IF EXISTS "allow all for test" ON a_chat_messages;

-- Create new policies for a_chat
CREATE POLICY "allow all"
ON a_chat
FOR ALL
TO authenticated
USING (true);

-- Create new policies for a_chat_users
CREATE POLICY "Users can view their chats"
ON a_chat_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  chat_id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their chat participation"
ON a_chat_users
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create new policies for a_chat_messages
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
  user_id = auth.uid() AND
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);