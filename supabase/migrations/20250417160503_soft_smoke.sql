/*
  # Configure Stories Storage and RLS

  1. Changes
    - Create stories storage bucket
    - Add storage policies for authenticated uploads and public reads
    - Enable RLS on stories table
    - Add table policies for story management

  2. Security
    - Allow authenticated users to upload stories
    - Allow public access to view stories
    - Restrict story management to owners
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
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'stories');

-- Enable RLS for stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting stories
CREATE POLICY "Users can create their own stories"
ON stories
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for viewing stories
CREATE POLICY "Stories are viewable by everyone"
ON stories
FOR SELECT TO public
USING (true);

-- Create policy for deleting stories
CREATE POLICY "Users can delete their own stories"
ON stories
FOR DELETE TO authenticated
USING (auth.uid() = user_id);