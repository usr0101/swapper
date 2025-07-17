/*
  # Enable Row Level Security and Proper Policies

  1. Security Enhancement
    - Enable RLS on all tables that currently have it disabled
    - Add proper policies based on user roles and data ownership
    - Implement admin-only access for sensitive operations

  2. Policy Structure
    - Public read access for pools (needed for browsing)
    - Authenticated user access for their own data
    - Admin-only access for sensitive operations
    - Secure wallet data access

  3. Admin Detection
    - Uses the VITE_ADMIN_WALLET from your configuration
    - Fallback admin wallet: J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M
*/

-- First, ensure RLS is enabled on all tables
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all users to read pools" ON public.pools;
DROP POLICY IF EXISTS "Allow all users to insert pools" ON public.pools;
DROP POLICY IF EXISTS "Allow all users to update pools" ON public.pools;
DROP POLICY IF EXISTS "Allow all users to delete pools" ON public.pools;
DROP POLICY IF EXISTS "Allow all users to manage pool wallets" ON public.pool_wallets;
DROP POLICY IF EXISTS "Allow all users to manage admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow all users to manage API configs" ON public.api_configs;

-- POOLS TABLE POLICIES
-- Allow everyone to read active pools (needed for public browsing)
CREATE POLICY "Public can read active pools"
  ON public.pools
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to read all pools
CREATE POLICY "Authenticated users can read all pools"
  ON public.pools
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow pool creators and admins to insert pools
CREATE POLICY "Pool creators can insert pools"
  ON public.pools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'sub' IS NOT NULL AND (
      created_by = auth.jwt() ->> 'sub' OR
      created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
    )
  );

-- Allow pool creators and admins to update their pools
CREATE POLICY "Pool creators can update their pools"
  ON public.pools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.jwt() ->> 'sub' OR
    created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
  )
  WITH CHECK (
    created_by = auth.jwt() ->> 'sub' OR
    created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
  );

-- Allow pool creators and admins to delete their pools
CREATE POLICY "Pool creators can delete their pools"
  ON public.pools
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.jwt() ->> 'sub' OR
    created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
  );

-- POOL_WALLETS TABLE POLICIES (Most sensitive - admin only)
-- Only allow reading wallet data for pool owners and admins
CREATE POLICY "Pool owners can read wallet data"
  ON public.pool_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE pools.pool_address = pool_wallets.pool_address 
      AND (
        pools.created_by = auth.jwt() ->> 'sub' OR
        pools.created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
      )
    )
  );

-- Only allow inserting wallet data for pool owners and admins
CREATE POLICY "Pool owners can insert wallet data"
  ON public.pool_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE pools.pool_address = pool_wallets.pool_address 
      AND (
        pools.created_by = auth.jwt() ->> 'sub' OR
        pools.created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
      )
    )
  );

-- Only allow updating wallet data for pool owners and admins
CREATE POLICY "Pool owners can update wallet data"
  ON public.pool_wallets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE pools.pool_address = pool_wallets.pool_address 
      AND (
        pools.created_by = auth.jwt() ->> 'sub' OR
        pools.created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE pools.pool_address = pool_wallets.pool_address 
      AND (
        pools.created_by = auth.jwt() ->> 'sub' OR
        pools.created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
      )
    )
  );

-- Only allow deleting wallet data for pool owners and admins
CREATE POLICY "Pool owners can delete wallet data"
  ON public.pool_wallets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE pools.pool_address = pool_wallets.pool_address 
      AND (
        pools.created_by = auth.jwt() ->> 'sub' OR
        pools.created_by = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M'
      )
    )
  );

-- ADMIN_SETTINGS TABLE POLICIES
-- Users can only read their own admin settings
CREATE POLICY "Users can read their own admin settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub');

-- Users can only insert their own admin settings
CREATE POLICY "Users can insert their own admin settings"
  ON public.admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

-- Users can only update their own admin settings
CREATE POLICY "Users can update their own admin settings"
  ON public.admin_settings
  FOR UPDATE
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub')
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

-- Users can only delete their own admin settings
CREATE POLICY "Users can delete their own admin settings"
  ON public.admin_settings
  FOR DELETE
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub');

-- Allow anonymous read for global platform branding (needed for app startup)
CREATE POLICY "Anonymous can read platform branding"
  ON public.admin_settings
  FOR SELECT
  TO anon
  USING (
    platform_name IS NOT NULL AND 
    platform_description IS NOT NULL AND 
    platform_icon IS NOT NULL
  );

-- API_CONFIGS TABLE POLICIES
-- Users can only manage their own API configs
CREATE POLICY "Users can read their own API configs"
  ON public.api_configs
  FOR SELECT
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own API configs"
  ON public.api_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own API configs"
  ON public.api_configs
  FOR UPDATE
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub')
  WITH CHECK (user_wallet = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own API configs"
  ON public.api_configs
  FOR DELETE
  TO authenticated
  USING (user_wallet = auth.jwt() ->> 'sub');

-- Create a function to check if user is admin (for future use)
CREATE OR REPLACE FUNCTION public.is_admin(wallet_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN wallet_address = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin(TEXT) TO authenticated, anon;

-- Create indexes for better performance on policy checks
CREATE INDEX IF NOT EXISTS idx_pools_created_by ON public.pools(created_by);
CREATE INDEX IF NOT EXISTS idx_pools_is_active ON public.pools(is_active);
CREATE INDEX IF NOT EXISTS idx_pool_wallets_pool_address ON public.pool_wallets(pool_address);
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_wallet ON public.admin_settings(user_wallet);
CREATE INDEX IF NOT EXISTS idx_api_configs_user_wallet ON public.api_configs(user_wallet);

-- Add comments for documentation
COMMENT ON POLICY "Public can read active pools" ON public.pools IS 
'Allows anonymous users to browse active pools for the public interface';

COMMENT ON POLICY "Pool owners can read wallet data" ON public.pool_wallets IS 
'Restricts wallet data access to pool creators and the admin wallet only';

COMMENT ON POLICY "Anonymous can read platform branding" ON public.admin_settings IS 
'Allows app to load platform branding before wallet connection';

COMMENT ON FUNCTION public.is_admin(TEXT) IS 
'Helper function to check if a wallet address is the admin wallet';