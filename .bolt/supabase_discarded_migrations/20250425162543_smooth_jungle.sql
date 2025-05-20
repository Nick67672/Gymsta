/*
  # Fix Chat Table Policies

  1. Changes
    - Add UPDATE policy to a_chat table to allow users to update chats they participate in
    - Fix existing RLS policies to ensure users can properly manage chats

  2. Security
    - Users can only update chats they are participants in
    - Maintains existing security model
    - Ensures last_message can be updated
*/

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

-- Add policy for inserting chats if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'a_chat'
    AND operation = 'INSERT'
  ) THEN
    CREATE POLICY "Users can create chats"
    ON a_chat
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;