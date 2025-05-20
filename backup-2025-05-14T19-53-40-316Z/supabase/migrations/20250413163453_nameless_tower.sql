/*
  # Create Storage Policies for Avatars

  1. Changes
    - Add storage policies for avatar management
    - Enable authenticated users to manage their own avatars
    - Allow public access to view avatars

  2. Security
    - Users can only upload/update/delete their own avatars
    - Public read access for all avatars
*/

-- Create bucket for avatar images if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  END IF;
END $$;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow users to upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view avatars
CREATE POLICY "Allow public access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');