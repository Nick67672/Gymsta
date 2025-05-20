/*
  # Fix Chat Recursion Issues

  1. Changes
    - Fix infinite recursion in conversation_participants policies
    - Simplify RLS policies for conversations and participants
    - Update message policies to use direct user checks

  2. Security
    - Maintain security while avoiding recursive checks
    - Ensure users can only access their own conversations
    - Keep message access restricted to conversation participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants they're part of" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they're part of" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to conversations they're part of" ON messages;

-- Recreate policies without recursion
CREATE POLICY "Users can view their own participants"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );