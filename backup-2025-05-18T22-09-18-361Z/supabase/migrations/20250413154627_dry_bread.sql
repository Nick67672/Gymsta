/*
  # Add Profile Insert Policy

  1. Changes
    - Add INSERT policy for profiles table to allow authenticated users to create their own profile

  2. Security
    - Enable INSERT for authenticated users where auth.uid() matches the profile id
*/

CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);