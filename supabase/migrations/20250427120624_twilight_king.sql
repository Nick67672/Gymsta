/*
  # Add Media Type to Posts

  1. Changes
    - Add media_type column to posts table
    - Default to 'image' for backward compatibility
    - Update RLS policies to maintain current access rules

  2. Security
    - No changes to security model
    - Maintains existing RLS policies
*/

-- Add media_type column to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts'
    AND column_name = 'media_type'
  ) THEN
    ALTER TABLE posts
    ADD COLUMN media_type text NOT NULL DEFAULT 'image';
  END IF;
END $$;