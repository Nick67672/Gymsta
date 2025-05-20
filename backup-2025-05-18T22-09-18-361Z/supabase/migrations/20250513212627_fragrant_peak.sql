/*
  # Add Gym Field to Workouts

  1. Changes
    - Add gym field to workouts table to match with user's gym
    - Update RLS policies to handle gym-specific visibility

  2. Security
    - Maintain existing RLS policies
    - Add policy for gym-specific workout visibility
*/

-- Add gym field to workouts table
ALTER TABLE workouts
ADD COLUMN gym text;

-- Create function to automatically set gym from user profile
CREATE OR REPLACE FUNCTION set_workout_gym()
RETURNS TRIGGER AS $$
BEGIN
  SELECT gym INTO NEW.gym
  FROM profiles
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set gym
CREATE TRIGGER set_workout_gym_trigger
  BEFORE INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION set_workout_gym();

-- Add policy for viewing workouts from same gym
CREATE POLICY "Users can view workouts from their gym"
ON workouts
FOR SELECT
TO authenticated
USING (
  is_private = false AND
  gym = (SELECT gym FROM profiles WHERE id = auth.uid())
);