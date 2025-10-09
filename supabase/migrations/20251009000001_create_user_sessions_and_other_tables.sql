/*
  # Create user_sessions, environments, and system_logs tables

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key) - Unique identifier for each user session
      - `username` (text) - Username of the logged-in user
      - `login_time` (timestamptz) - When the user logged in
      - `logout_time` (timestamptz, nullable) - When the user logged out
      - `ip_address` (text, nullable) - IP address of the user
      - `status` (text) - Session status: 'active' or 'completed'
      - `created_at` (timestamptz) - Record creation timestamp

    - `environments`
      - `id` (uuid, primary key) - Unique identifier for each environment
      - `name` (text, unique) - Environment name
      - `integrations` (jsonb) - Integration configurations for this environment
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `system_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_id` (text, nullable) - ID of the user who performed the action
      - `action` (text) - Action type/name
      - `details` (jsonb) - Additional details about the action
      - `timestamp` (timestamptz) - When the action occurred
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add public access policies for all tables (no authentication required for now)

  3. Notes
    - user_sessions tracks login/logout activity for audit purposes
    - environments store different testing environment configurations
    - system_logs provide audit trail for all system actions
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  login_time timestamptz DEFAULT now(),
  logout_time timestamptz,
  ip_address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to user_sessions"
  ON user_sessions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_sessions_username ON user_sessions(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON user_sessions(login_time DESC);

-- Create environments table
CREATE TABLE IF NOT EXISTS environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  integrations jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to environments"
  ON environments
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_environments_name ON environments(name);

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to system_logs"
  ON system_logs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
