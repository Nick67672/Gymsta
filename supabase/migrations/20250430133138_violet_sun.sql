/*
  # Create Workout Images Storage Bucket

  1. Changes
    - Creates a dedicated storage bucket for workout progress images
    - Sets up proper RLS policies for the bucket
    - Ensures users can only manage their own images

  2. Security
    - Storage bucket is public for reading (viewing images)
    - Storage permissions limited to authenticated users for writing
    - Each user can only upload to their own folder
*/

-- Create storage bucket for workout images if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'workout_images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('workout_images', 'workout_images', true, 5242880); -- 5MB limit
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload workout images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage their own workout images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read workout images" ON storage.objects;

-- Create storage policies with improved security
CREATE POLICY "Allow users to upload workout images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to update workout images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workout_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to delete workout images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to view workout images
CREATE POLICY "Allow public to read workout images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workout_images');