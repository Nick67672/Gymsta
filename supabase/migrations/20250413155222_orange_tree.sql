/*
  # Create Storage Bucket for Posts

  1. Changes
    - Create a new storage bucket for post images
    - Enable public access to the bucket
    - Add storage policies for authenticated users
*/

-- Create bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true);

-- Allow authenticated users to upload files to the bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to files
CREATE POLICY "Allow public access to files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');