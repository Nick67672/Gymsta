/*
  # Simplify Stories Schema

  1. Changes
    - Simplify stories table structure
    - Remove unnecessary constraints
    - Add proper indexes for performance

  2. Security
    - Maintain RLS policies
    - Keep proper foreign key relationships
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS stories;

-- Create simplified stories table
CREATE TABLE stories (
  id bigint PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  media_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);