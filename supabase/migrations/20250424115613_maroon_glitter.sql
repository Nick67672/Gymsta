/*
  # Configure Stories Storage and Table

  1. Changes
    - Create stories storage bucket
    - Set up storage policies for authenticated uploads
    - Simplify stories table structure
    - Add appropriate RLS policies

  2. Security
    - Only authenticated users can upload stories
    - Public read access for stories
    - Users can only manage their own stories
*/

-- Create stories bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'stories'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('stories', 'stories', true);
  END IF;
END $$;

-- Create storage policies
CREATE POLICY "Allow authenticated users to upload stories"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to manage their own stories"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'stories' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow public to read stories"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'stories');

-- Drop existing stories table if it exists
DROP TABLE IF EXISTS stories;

-- Create stories table with auto-incrementing ID
CREATE TABLE stories (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own stories"
ON stories
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view stories"
ON stories
FOR SELECT
TO public
USING (true);