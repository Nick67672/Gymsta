/*
  # Add Context Setting Function for Message Decryption

  1. Changes
    - Add function to set conversation context for decryption
    - Ensure only conversation participants can set context

  2. Security
    - Only conversation participants can set the context
    - Context is scoped to the current database session
*/

-- Create function to set conversation context
CREATE OR REPLACE FUNCTION set_conversation_context(conversation_id uuid)
RETURNS void AS $$
BEGIN
  -- Verify user is part of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = $1
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a participant in this conversation';
  END IF;

  -- Set the conversation context for the current session
  PERFORM set_config('app.current_conversation_id', $1::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 