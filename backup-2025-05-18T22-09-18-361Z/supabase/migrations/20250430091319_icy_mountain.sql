/*
  # Add Workouts Table

  1. New Tables
    - `workouts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `exercises` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on workouts table
    - Add policies for authenticated users
*/

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  exercises jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own workouts
CREATE POLICY "Users can insert their own workouts"
ON workouts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own workouts
CREATE POLICY "Users can view their own workouts"
ON workouts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);