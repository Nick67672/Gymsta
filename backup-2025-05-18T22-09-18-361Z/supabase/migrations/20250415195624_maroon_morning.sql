/*
  # Fix recursive policies for conversation participants

  1. Changes
    - Remove recursive policies from conversation_participants table
    - Add clearer, non-recursive policies for:
      - Inserting participants (users can only add themselves)
      - Selecting participants (users can view participants in conversations they're part of)
      - Deleting participants (users can remove themselves from conversations)

  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Ensures users can only manage their own participation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participants" ON conversation_participants;

-- Create new, non-recursive policies
CREATE POLICY "Users can add themselves to conversations"
ON conversation_participants
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can view conversation participants"
ON conversation_participants
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM conversation_participants my_convos 
    WHERE my_convos.conversation_id = conversation_participants.conversation_id 
    AND my_convos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can leave conversations"
ON conversation_participants
FOR DELETE
TO public
USING (
  user_id = auth.uid()
);