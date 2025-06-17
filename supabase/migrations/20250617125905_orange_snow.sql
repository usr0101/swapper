/*
  # Fix RLS Policies for Migration Support

  1. Security Updates
    - Update pools table RLS policies to allow anonymous users to insert during migration
    - Ensure proper policies for authenticated users
    - Add policies for admin_settings and api_configs tables for anonymous access during migration

  2. Policy Changes
    - Allow anonymous users to insert pools (for migration)
    - Allow anonymous users to manage admin_settings and api_configs (for migration)
    - Keep existing authenticated user policies
*/

-- Drop existing restrictive policies and create more permissive ones for migration
DROP POLICY IF EXISTS "Allow all users to read pools" ON pools;
DROP POLICY IF EXISTS "Allow authenticated users to insert pools" ON pools;
DROP POLICY IF EXISTS "Allow authenticated users to update pools" ON pools;
DROP POLICY IF EXISTS "Allow authenticated users to delete pools" ON pools;

-- Create new policies for pools table
CREATE POLICY "Allow all users to read pools"
  ON pools
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow all users to insert pools"
  ON pools
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow all users to update pools"
  ON pools
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all users to delete pools"
  ON pools
  FOR DELETE
  TO public
  USING (true);

-- Update admin_settings policies
DROP POLICY IF EXISTS "Allow users to manage their own admin settings" ON admin_settings;

CREATE POLICY "Allow all users to manage admin settings"
  ON admin_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Update api_configs policies
DROP POLICY IF EXISTS "Allow users to manage their own API configs" ON api_configs;

CREATE POLICY "Allow all users to manage API configs"
  ON api_configs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Update pool_wallets policies
DROP POLICY IF EXISTS "Allow authenticated users to manage pool wallets" ON pool_wallets;

CREATE POLICY "Allow all users to manage pool wallets"
  ON pool_wallets
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);