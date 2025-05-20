/*
  # Fix Chat Insertion Policy

  1. Changes
    - Add INSERT policy for a_chat table to allow authenticated users to create new chats
    - This fixes the error "new row violates row-level security policy for table a_chat"

  2. Security
    - Maintains RLS protection
    - Allows authenticated users to create chats
*/

-- Add a new policy for authenticated users to create chats
CREATE POLICY "Users can create chats"
ON a_chat
FOR INSERT
TO authenticated
WITH CHECK (true);