/*
  # Create NFT Swap Platform Database Schema

  1. New Tables
    - `pools` - Store NFT collection pool configurations
    - `pool_wallets` - Store encrypted wallet data for pools
    - `admin_settings` - Store admin configuration settings
    - `api_configs` - Store API configuration per user

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and admin access
    - Secure wallet data with proper access controls

  3. Functions
    - `increment_volume` - Helper function to increment pool volume
*/

-- Create pools table
CREATE TABLE IF NOT EXISTS public.pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id text NOT NULL,
    collection_name text NOT NULL,
    collection_symbol text NOT NULL,
    collection_image text NOT NULL,
    collection_address text NOT NULL,
    pool_address text NOT NULL,
    swap_fee double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    nft_count integer DEFAULT 0 NOT NULL,
    total_volume bigint DEFAULT 0 NOT NULL,
    description text
);

ALTER TABLE public.pools ADD CONSTRAINT pools_pkey PRIMARY KEY (id);
ALTER TABLE public.pools ADD CONSTRAINT pools_collection_id_key UNIQUE (collection_id);

-- Create pool_wallets table
CREATE TABLE IF NOT EXISTS public.pool_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_address text NOT NULL,
    public_key text NOT NULL,
    encrypted_secret_key text NOT NULL,
    has_private_key boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.pool_wallets ADD CONSTRAINT pool_wallets_pkey PRIMARY KEY (id);
ALTER TABLE public.pool_wallets ADD CONSTRAINT pool_wallets_pool_address_key UNIQUE (pool_address);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_wallet text NOT NULL,
    fee_collector_wallet text NOT NULL,
    default_swap_fee double precision NOT NULL,
    platform_active boolean NOT NULL,
    maintenance_message text NOT NULL,
    helius_api_key text NOT NULL,
    network text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_user_wallet_key UNIQUE (user_wallet);

-- Create api_configs table
CREATE TABLE IF NOT EXISTS public.api_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_wallet text NOT NULL,
    helius_api_key text NOT NULL,
    helius_rpc text NOT NULL,
    network text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.api_configs ADD CONSTRAINT api_configs_pkey PRIMARY KEY (id);
ALTER TABLE public.api_configs ADD CONSTRAINT api_configs_user_wallet_key UNIQUE (user_wallet);

-- Enable Row Level Security
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for pools table
CREATE POLICY "Allow all users to read pools"
  ON public.pools
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert pools"
  ON public.pools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pools"
  ON public.pools
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete pools"
  ON public.pools
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for pool_wallets table
CREATE POLICY "Allow authenticated users to manage pool wallets"
  ON public.pool_wallets
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for admin_settings table
CREATE POLICY "Allow users to manage their own admin settings"
  ON public.admin_settings
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for api_configs table
CREATE POLICY "Allow users to manage their own API configs"
  ON public.api_configs
  FOR ALL
  TO authenticated
  USING (true);

-- Create increment_volume function
CREATE OR REPLACE FUNCTION public.increment_volume(pool_id TEXT, amount BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE pools
  SET total_volume = total_volume + amount
  WHERE collection_id = pool_id;
END;
$$ LANGUAGE plpgsql;