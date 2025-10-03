/*
  # Create integrations table

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key) - Unique identifier for each integration
      - `name` (text) - User-friendly name for the integration
      - `type` (text) - Type of integration: 'database', 'proxy', or 'vpn'
      - `status` (text) - Current status: 'connected', 'disconnected', or 'error'
      - `last_sync` (text, nullable) - Last synchronization timestamp description
      - `config` (jsonb) - Configuration parameters stored as JSON
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `integrations` table
    - Add policy for all users to manage their own integrations (no auth for now, public access)

  3. Notes
    - Config field stores all integration-specific parameters (host, port, credentials, etc.)
    - Status field tracks connection state
    - Type field determines which configuration fields are relevant
*/

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('database', 'proxy', 'vpn')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync text,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to integrations"
  ON integrations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);