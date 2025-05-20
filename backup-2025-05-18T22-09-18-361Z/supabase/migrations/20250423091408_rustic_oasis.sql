/*
  # Add Product Links to Posts

  1. Changes
    - Add product_id column to posts table
    - Add foreign key constraint to products table
    - Update RLS policies to allow product linking
*/

-- Add product_id column to posts table
ALTER TABLE posts
ADD COLUMN product_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- Update RLS policy for posts to allow updates to product_id
CREATE POLICY "Users can update their own post product links"
ON posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);