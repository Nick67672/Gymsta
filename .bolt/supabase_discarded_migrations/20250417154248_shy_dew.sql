/*
  # Add Stories Storage Configuration

  1. Changes
    - Create storage bucket for stories if it doesn't exist
    - Add storage policies for story media management
    - Enable authenticated users to manage their own stories
    - Allow public access to view stories

  2. Security
    - Users can only upload/update/delete their own stories
    - Public read access for all story media
*/

-- Create storage bucket for stories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'stories'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('stories', 'stories', true);
  END IF;
END $$;

-- Allow authenticated users to upload files to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Allow users to upload their own story media'
    AND table_name = 'objects'
  ) THEN
    CREATE POLICY "Allow users to upload their own story media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'stories' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow users to update their own story media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Allow users to update their own story media'
    AND table_name = 'objects'
  ) THEN
    CREATE POLICY "Allow users to update their own story media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'stories' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow users to delete their own story media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Allow users to delete their own story media'
    AND table_name = 'objects'
  ) THEN
    CREATE POLICY "Allow users to delete their own story media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'stories' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow public access to view story media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Allow public access to story media'
    AND table_name = 'objects'
  ) THEN
    CREATE POLICY "Allow public access to story media"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'stories');
  END IF;
END $$;