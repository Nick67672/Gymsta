/*
  # Add updated_at column to a_chat table

  1. Changes
    - Add updated_at column to a_chat table
    - Create trigger to automatically update the column
    - Ensure existing rows have a valid timestamp

  2. Security
    - No security changes needed, using existing policies
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'a_chat'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE a_chat
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Set updated_at for existing rows to match created_at
UPDATE a_chat
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Add trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'handle_updated_at'
    AND tgrelid = 'a_chat'::regclass
  ) THEN
    CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON a_chat
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;