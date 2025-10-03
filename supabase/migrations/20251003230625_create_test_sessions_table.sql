/*
  # Create test_sessions table

  1. New Tables
    - `test_sessions`
      - `id` (uuid, primary key)
      - `session_id` (text, unique identifier for the test session)
      - `status` (text, current status: pending/running/completed/stopped/error)
      - `test_type` (text, type of test being run)
      - `config` (jsonb, test configuration)
      - `results` (jsonb, test results)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `test_sessions` table
    - Add policy for authenticated users to manage test sessions
*/

CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  test_type text,
  config jsonb DEFAULT '{}'::jsonb,
  results jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('pending', 'running', 'completed', 'stopped', 'error'))
);

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on test_sessions for authenticated users"
  ON test_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);