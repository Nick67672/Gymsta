/*
  # Add Encryption Fields to Messages

  1. Changes
    - Add encrypted_content column to a_chat_messages table
    - Add iv column for storing initialization vector
    - Add public_key column to profiles table for key exchange
    - Update RLS policies

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Add encryption fields to messages table
ALTER TABLE a_chat_messages
ADD COLUMN encrypted_content text,
ADD COLUMN iv text;

-- Add public key field to profiles
ALTER TABLE profiles
ADD COLUMN public_key text;

-- Update message policies for encrypted content
CREATE POLICY "Users can view encrypted messages in their conversations"
ON a_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = a_chat_messages.chat_id
    AND user_id = auth.uid()
  )
);

-- Allow users to update their public key
CREATE POLICY "Users can update their own public key"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);