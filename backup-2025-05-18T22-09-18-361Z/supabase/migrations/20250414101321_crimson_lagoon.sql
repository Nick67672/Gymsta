/*
  # Add shipping addresses table

  1. New Tables
    - `shipping_addresses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `full_name` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on shipping_addresses table
    - Add policies for authenticated users
*/

CREATE TABLE shipping_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own shipping addresses
CREATE POLICY "Users can manage their own shipping addresses"
  ON shipping_addresses
  FOR ALL
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();