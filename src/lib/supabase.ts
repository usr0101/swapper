import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface PoolConfig {
  id: string;
  collection_id: string;
  collection_name: string;
  collection_symbol: string;
  collection_image: string;
  collection_address: string;
  pool_address: string;
  swap_fee: number;
  created_at: string;
  created_by: string;
  is_active: boolean;
  nft_count: number;
  total_volume: number;
  description?: string;
}

export interface PoolWallet {
  id: string;
  pool_address: string;
  public_key: string;
  encrypted_secret_key: string;
  has_private_key: boolean;
  created_at: string;
}

export interface AdminSettings {
  id: string;
  user_wallet: string;
  fee_collector_wallet: string;
  default_swap_fee: number;
  platform_active: boolean;
  maintenance_message: string;
  helius_api_key: string;
  network: 'devnet' | 'mainnet-beta';
  created_at: string;
  updated_at: string;
}

export interface ApiConfig {
  id: string;
  user_wallet: string;
  helius_api_key: string;
  helius_rpc: string;
  network: 'devnet' | 'mainnet-beta';
  created_at: string;
  updated_at: string;
}

// Pool operations
export const createPool = async (poolData: Omit<PoolConfig, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('pools')
    .insert([{
      collection_id: poolData.collection_id,
      collection_name: poolData.collection_name,
      collection_symbol: poolData.collection_symbol,
      collection_image: poolData.collection_image,
      collection_address: poolData.collection_address,
      pool_address: poolData.pool_address,
      swap_fee: poolData.swap_fee,
      created_by: poolData.created_by,
      is_active: poolData.is_active,
      nft_count: poolData.nft_count,
      total_volume: poolData.total_volume,
      description: poolData.description,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAllPools = async (): Promise<PoolConfig[]> => {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getPool = async (collectionId: string): Promise<PoolConfig | null> => {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('collection_id', collectionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updatePoolStats = async (collectionId: string, nftCount: number, volume: number = 0) => {
  const updateData: { nft_count: number; } = { nft_count: nftCount };

  const { data, error } = await supabase
    .from('pools')
    .update(updateData)
    .eq('collection_id', collectionId)
    .select()
    .single();

  if (error) throw error;

  // If there's volume, call the RPC separately to increment it
  if (volume > 0) {
    const { error: rpcError } = await supabase.rpc('increment_volume', { pool_id: collectionId, amount: volume });
    if (rpcError) {
      console.error('Error calling increment_volume RPC:', rpcError);
      // Depending on desired behavior, you might want to throw rpcError here
    }
  }
  
  return data;
};

export const togglePoolStatus = async (collectionId: string) => {
  const pool = await getPool(collectionId);
  if (!pool) throw new Error('Pool not found');

  const { data, error } = await supabase
    .from('pools')
    .update({ is_active: !pool.is_active })
    .eq('collection_id', collectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePool = async (collectionId: string) => {
  // First delete associated wallet data
  await supabase
    .from('pool_wallets')
    .delete()
    .eq('pool_address', (await getPool(collectionId))?.pool_address);

  const { error } = await supabase
    .from('pools')
    .delete()
    .eq('collection_id', collectionId);

  if (error) throw error;
};

// Pool wallet operations (encrypted storage)
const encryptSecretKey = (secretKey: string): string => {
  // Simple base64 encoding for now - in production, use proper encryption
  return btoa(secretKey);
};

const decryptSecretKey = (encryptedKey: string): string => {
  // Simple base64 decoding for now - in production, use proper decryption
  return atob(encryptedKey);
};

export const storePoolWallet = async (poolAddress: string, walletData: {
  publicKey: string;
  secretKey: string;
  hasPrivateKey: boolean;
}) => {
  const { data, error } = await supabase
    .from('pool_wallets')
    .upsert([{
      pool_address: poolAddress,
      public_key: walletData.publicKey,
      encrypted_secret_key: encryptSecretKey(walletData.secretKey),
      has_private_key: walletData.hasPrivateKey,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPoolWalletData = async (poolAddress: string) => {
  const { data, error } = await supabase
    .from('pool_wallets')
    .select('*')
    .eq('pool_address', poolAddress)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  
  if (data) {
    return {
      publicKey: data.public_key,
      secretKey: decryptSecretKey(data.encrypted_secret_key),
      hasPrivateKey: data.has_private_key,
    };
  }
  
  return null;
};

// Admin settings operations
export const getAdminSettings = async (userWallet: string): Promise<AdminSettings | null> => {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('user_wallet', userWallet)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const saveAdminSettings = async (settings: Omit<AdminSettings, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('admin_settings')
    .upsert([{
      user_wallet: settings.user_wallet,
      fee_collector_wallet: settings.fee_collector_wallet,
      default_swap_fee: settings.default_swap_fee,
      platform_active: settings.platform_active,
      maintenance_message: settings.maintenance_message,
      helius_api_key: settings.helius_api_key,
      network: settings.network,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// API configuration operations
export const getApiConfig = async (userWallet: string): Promise<ApiConfig | null> => {
  const { data, error } = await supabase
    .from('api_configs')
    .select('*')
    .eq('user_wallet', userWallet)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const saveApiConfig = async (config: Omit<ApiConfig, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('api_configs')
    .upsert([{
      user_wallet: config.user_wallet,
      helius_api_key: config.helius_api_key,
      helius_rpc: config.helius_rpc,
      network: config.network,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Migration utilities
export const migrateFromLocalStorage = async (userWallet: string) => {
  try {
    console.log('🔄 Starting migration from localStorage to Supabase...');

    // Migrate admin settings
    const adminSettings = localStorage.getItem('swapper_admin_settings');
    if (adminSettings) {
      const settings = JSON.parse(adminSettings);
      await saveAdminSettings({
        user_wallet: userWallet,
        fee_collector_wallet: settings.feeCollectorWallet || userWallet,
        default_swap_fee: settings.defaultSwapFee || 0.05,
        platform_active: settings.platformActive !== false,
        maintenance_message: settings.maintenanceMessage || 'Platform is currently under maintenance.',
        helius_api_key: settings.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1',
        network: settings.network || 'devnet',
      });
      localStorage.removeItem('swapper_admin_settings');
      console.log('✅ Admin settings migrated');
    }

    // Migrate API config
    const apiConfig = localStorage.getItem('swapper_api_config');
    if (apiConfig) {
      const config = JSON.parse(apiConfig);
      await saveApiConfig({
        user_wallet: userWallet,
        helius_api_key: config.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1',
        helius_rpc: config.heliusRpc || 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
        network: config.network || 'devnet',
      });
      localStorage.removeItem('swapper_api_config');
      console.log('✅ API config migrated');
    }

    // Migrate pools
    const pools = localStorage.getItem('swapper_pools');
    if (pools) {
      const poolsData = JSON.parse(pools);
      for (const [collectionId, pool] of Object.entries(poolsData)) {
        const poolConfig = pool as any;
        await createPool({
          collection_id: collectionId,
          collection_name: poolConfig.collectionName,
          collection_symbol: poolConfig.collectionSymbol,
          collection_image: poolConfig.collectionImage,
          collection_address: poolConfig.collectionAddress,
          pool_address: poolConfig.poolAddress,
          swap_fee: poolConfig.swapFee,
          created_by: poolConfig.createdBy || userWallet,
          is_active: poolConfig.isActive !== false,
          nft_count: poolConfig.nftCount || 0,
          total_volume: poolConfig.totalVolume || 0,
          description: poolConfig.description,
        });

        // Migrate pool wallet data if exists
        if (poolConfig.poolWalletData) {
          await storePoolWallet(poolConfig.poolAddress, poolConfig.poolWalletData);
        }
      }
      localStorage.removeItem('swapper_pools');
      console.log('✅ Pools migrated');
    }

    // Migrate individual pool wallet data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pool_wallet_')) {
        const poolAddress = key.replace('pool_wallet_', '');
        const walletData = localStorage.getItem(key);
        if (walletData) {
          const data = JSON.parse(walletData);
          await storePoolWallet(poolAddress, {
            publicKey: data.publicKey,
            secretKey: data.secretKey,
            hasPrivateKey: true,
          });
          localStorage.removeItem(key);
        }
      }
    }

    // Clean up network preference
    localStorage.removeItem('swapper_network');

    console.log('🎉 Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};