/*
  # Fix Stories Table and Storage Policies

  1. Changes
    - Ensure stories table has correct columns and constraints
    - Update storage policies for better security
    - Add media_type column to stories table

  2. Security
    - Maintain RLS protection
    - Allow users to manage their own stories
    - Enable public viewing of stories
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS stories;
DROP POLICY IF EXISTS "Allow authenticated users to upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage their own stories" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read stories" ON storage.objects;

-- Create stories table
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
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

-- Create storage bucket if it doesn't exist
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