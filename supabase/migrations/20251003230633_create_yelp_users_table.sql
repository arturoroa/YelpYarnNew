/*
  # Create yelp_users table

  1. New Tables
    - `yelp_users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `email` (text)
      - `config` (jsonb, user configuration and settings)
      - `is_active` (boolean, whether user is active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `yelp_users` table
    - Add policy for authenticated users to manage yelp users
*/

CREATE TABLE IF NOT EXISTS yelp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE yelp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on yelp_users for authenticated users"
  ON yelp_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);