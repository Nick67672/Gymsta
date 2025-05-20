/*
  # Add Messages Schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `conversation_participants`
      - `conversation_id` (uuid, references conversations)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)

    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `read_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_participants table
CREATE TABLE conversation_participants (
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE,
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add trigger for conversations updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add policies for conversations
CREATE POLICY "Users can view conversations they're part of"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND user_id = auth.uid()
    )
  );

-- Add policies for conversation_participants
CREATE POLICY "Users can view conversation participants they're part of"
  ON conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Add policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to conversations they're part of"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Create function to update conversation updated_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();