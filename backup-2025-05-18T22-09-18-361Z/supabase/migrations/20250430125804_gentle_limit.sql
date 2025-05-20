/*
  # Update Workouts Table

  1. Changes
    - Add caption field for workout descriptions
    - Add progress_image_url field for tracking progress photos
    - Add is_private field to control visibility
    - Update RLS policies for privacy control
  
  2. Security
    - Maintain RLS protection
    - Add policy for non-private (global) workouts
*/

-- Add new columns to the workouts table
ALTER TABLE workouts 
ADD COLUMN caption text,
ADD COLUMN progress_image_url text,
ADD COLUMN is_private boolean DEFAULT true;

-- Create storage bucket for workout progress images if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'workout_images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('workout_images', 'workout_images', true);
  END IF;
END $$;

-- Create storage policies for workout images
CREATE POLICY "Allow authenticated users to upload workout images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to manage their own workout images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'workout_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow public to read workout images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workout_images');

-- Update RLS policies for workouts
DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;

-- Allow users to view their own workouts
CREATE POLICY "Users can view their own workouts"
ON workouts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to view global workouts (not private)
CREATE POLICY "Users can view global workouts"
ON workouts
FOR SELECT
TO authenticated
USING (is_private = false);