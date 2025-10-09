/*
  # Create system_users table for authentication

  1. New Tables
    - `system_users`
      - `id` (uuid, primary key) - Unique identifier for each system user
      - `username` (text, unique) - Username for login
      - `password` (text) - Hashed password
      - `type` (text) - User type: 'systemadmin' or 'user'
      - `email` (text, nullable) - Email address
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on system_users table
    - Add public access policy (no authentication required for now)

  3. Notes
    - system_users table stores authentication credentials for system admin and regular users
    - Default system admin user 'aroa' should be created with password 'aroa'
*/

-- Create system_users table
CREATE TABLE IF NOT EXISTS system_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  type text NOT NULL CHECK (type IN ('systemadmin', 'user')),
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to system_users"
  ON system_users
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);
CREATE INDEX IF NOT EXISTS idx_system_users_type ON system_users(type);

-- Insert default system admin user 'aroa'
INSERT INTO system_users (username, password, type, email)
VALUES ('aroa', 'aroa', 'systemadmin', 'aroa@example.com')
ON CONFLICT (username) DO NOTHING;
