/*
  # Add RLS policies for chat creation

  1. Changes
    - Add RLS policy to allow authenticated users to create new chats
    - Add RLS policy to allow authenticated users to update their chats
    - Add RLS policy to allow authenticated users to delete their chats

  2. Security
    - Enable RLS on `a_chat` table (already enabled)
    - Add policies for INSERT, UPDATE, and DELETE operations
    - Ensure users can only manage chats they are participants in
*/

-- Policy to allow authenticated users to create new chats
CREATE POLICY "Users can create new chats"
ON public.a_chat
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow users to update chats they are part of
CREATE POLICY "Users can update their chats"
ON public.a_chat
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy to allow users to delete chats they are part of
CREATE POLICY "Users can delete their chats"
ON public.a_chat
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = auth.uid()
  )
);