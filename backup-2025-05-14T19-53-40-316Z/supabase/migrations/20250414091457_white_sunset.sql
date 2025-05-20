/*
  # Create Storage Bucket for Products

  1. Changes
    - Create a new storage bucket for product images
    - Enable public access to the bucket
    - Add storage policies for authenticated users
*/

-- Create bucket for product images if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'products'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('products', 'products', true);
  END IF;
END $$;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow users to upload their own product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own product images
CREATE POLICY "Allow users to update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own product images
CREATE POLICY "Allow users to delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view product images
CREATE POLICY "Allow public access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');