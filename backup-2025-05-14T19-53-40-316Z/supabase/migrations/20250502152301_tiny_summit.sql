/*
  # Add Exercise Structure Validation

  1. Changes
    - Add check constraint for exercises array structure
    - Ensure basic array validation
    - Add documentation comment
  
  2. Security
    - Maintain data integrity for workout exercises
*/

-- Add check constraint for basic array structure validation
ALTER TABLE workouts
ADD CONSTRAINT valid_exercises_structure
CHECK (
  jsonb_typeof(exercises) = 'array' AND
  jsonb_array_length(exercises) > 0
);

-- Add trigger function to validate exercise structure
CREATE OR REPLACE FUNCTION validate_exercise_structure()
RETURNS trigger AS $$
BEGIN
  -- Check each exercise has required fields
  IF NOT (
    SELECT bool_and(
      (exercise->>'name' IS NOT NULL) AND
      (exercise->'sets' IS NOT NULL) AND
      (jsonb_typeof(exercise->'sets') = 'array') AND
      (jsonb_array_length(exercise->'sets') > 0)
    )
    FROM jsonb_array_elements(NEW.exercises) exercise
  ) THEN
    RAISE EXCEPTION 'Invalid exercise structure. Each exercise must have a name and non-empty sets array.';
  END IF;

  -- Check each set has required fields
  IF NOT (
    SELECT bool_and(
      (set->>'reps' IS NOT NULL) AND
      (set->>'weight' IS NOT NULL)
    )
    FROM jsonb_array_elements(NEW.exercises) exercise,
         jsonb_array_elements(exercise->'sets') set
  ) THEN
    RAISE EXCEPTION 'Invalid set structure. Each set must have reps and weight.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate exercise structure
DROP TRIGGER IF EXISTS validate_exercise_structure_trigger ON workouts;
CREATE TRIGGER validate_exercise_structure_trigger
  BEFORE INSERT OR UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION validate_exercise_structure();

-- Add comment explaining the exercises structure
COMMENT ON COLUMN workouts.exercises IS 'Array of exercises. Each exercise has: name (string), sets (array of {reps: number, weight: number})';