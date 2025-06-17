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
  platform_name?: string;
  platform_description?: string;
  platform_icon?: string;
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
  
  // Convert total_volume from lamports to SOL for display
  const poolsWithConvertedVolume = (data || []).map(pool => ({
    ...pool,
    total_volume: pool.total_volume / 1_000_000_000 // Convert lamports to SOL
  }));
  
  return poolsWithConvertedVolume;
};

export const getPool = async (collectionId: string): Promise<PoolConfig | null> => {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('collection_id', collectionId)
    .maybeSingle();

  if (error) throw error;
  
  // Convert total_volume from lamports to SOL for display
  if (data) {
    data.total_volume = data.total_volume / 1_000_000_000;
  }
  
  return data;
};

export const updatePool = async (collectionId: string, updates: Partial<PoolConfig>) => {
  const { data, error } = await supabase
    .from('pools')
    .update(updates)
    .eq('collection_id', collectionId)
    .select()
    .single();

  if (error) throw error;
  
  // Convert total_volume from lamports to SOL for display
  if (data) {
    data.total_volume = data.total_volume / 1_000_000_000;
  }
  
  return data;
};

export const updatePoolStats = async (collectionId: string, nftCount: number, volumeInSOL: number = 0) => {
  const updateData: { nft_count: number; } = { nft_count: nftCount };

  const { data, error } = await supabase
    .from('pools')
    .update(updateData)
    .eq('collection_id', collectionId)
    .select()
    .single();

  if (error) throw error;

  // If there's volume, call the RPC separately to increment it
  if (volumeInSOL > 0) {
    // Convert SOL to lamports (multiply by 10^9) and round to ensure integer
    const volumeInLamports = Math.round(volumeInSOL * 1_000_000_000);
    
    console.log(`💰 Adding volume: ${volumeInSOL} SOL (${volumeInLamports} lamports) to pool ${collectionId}`);
    
    const { error: rpcError } = await supabase.rpc('increment_volume', { 
      pool_id: collectionId, 
      amount: volumeInLamports 
    });
    if (rpcError) {
      console.error('Error calling increment_volume RPC:', rpcError);
    }
  }
  
  // Convert total_volume from lamports to SOL for display
  if (data) {
    data.total_volume = data.total_volume / 1_000_000_000;
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
  
  // Convert total_volume from lamports to SOL for display
  if (data) {
    data.total_volume = data.total_volume / 1_000_000_000;
  }
  
  return data;
};

export const deletePool = async (collectionId: string) => {
  // First delete associated wallet data
  const pool = await getPool(collectionId);
  if (pool) {
    await supabase
      .from('pool_wallets')
      .delete()
      .eq('pool_address', pool.pool_address);
  }

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
  console.log('💾 Storing pool wallet in Supabase:', {
    poolAddress,
    publicKey: walletData.publicKey,
    hasSecretKey: !!(walletData.secretKey && walletData.secretKey.trim() !== ''),
    hasPrivateKey: walletData.hasPrivateKey,
    secretKeyLength: walletData.secretKey ? walletData.secretKey.length : 0,
  });

  // CRITICAL FIX: Ensure we have valid data before storing
  if (!walletData.publicKey || !poolAddress) {
    throw new Error('Invalid wallet data: missing public key or pool address');
  }

  // CRITICAL FIX: Ensure hasPrivateKey is correctly set
  const hasValidSecretKey = walletData.secretKey && walletData.secretKey.trim() !== '';
  const finalHasPrivateKey = hasValidSecretKey && walletData.hasPrivateKey === true;

  console.log('💾 Final wallet data being stored:', {
    poolAddress,
    publicKey: walletData.publicKey,
    hasValidSecretKey,
    originalHasPrivateKey: walletData.hasPrivateKey,
    finalHasPrivateKey,
  });

  const { data, error } = await supabase
    .from('pool_wallets')
    .upsert([{
      pool_address: poolAddress,
      public_key: walletData.publicKey,
      encrypted_secret_key: hasValidSecretKey ? encryptSecretKey(walletData.secretKey) : '',
      has_private_key: finalHasPrivateKey,
    }], {
      onConflict: 'pool_address'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error storing pool wallet:', error);
    throw error;
  }

  console.log('✅ Pool wallet stored successfully in Supabase');
  return data;
};

export const getPoolWalletData = async (poolAddress: string) => {
  console.log('🔍 Retrieving pool wallet from Supabase for:', poolAddress);

  const { data, error } = await supabase
    .from('pool_wallets')
    .select('*')
    .eq('pool_address', poolAddress)
    .maybeSingle();

  if (error) {
    console.error('❌ Error retrieving pool wallet from Supabase:', error);
    throw error;
  }
  
  if (data) {
    console.log('🔍 Raw Supabase wallet data:', {
      found: true,
      pool_address: data.pool_address,
      public_key: data.public_key,
      has_private_key: data.has_private_key,
      has_encrypted_secret_key: !!(data.encrypted_secret_key && data.encrypted_secret_key.trim() !== ''),
    });

    // CRITICAL FIX: Properly decrypt and validate the secret key
    let decryptedSecretKey = '';
    try {
      if (data.encrypted_secret_key && data.encrypted_secret_key.trim() !== '') {
        decryptedSecretKey = decryptSecretKey(data.encrypted_secret_key);
        console.log('🔓 Secret key decrypted successfully, length:', decryptedSecretKey.length);
      } else {
        console.log('⚠️ No encrypted secret key found in database');
      }
    } catch (decryptError) {
      console.error('❌ Error decrypting secret key:', decryptError);
      decryptedSecretKey = '';
    }

    const walletData = {
      publicKey: data.public_key,
      secretKey: decryptedSecretKey,
      hasPrivateKey: data.has_private_key && decryptedSecretKey !== '',
    };

    console.log('✅ Final wallet data returned:', {
      publicKey: walletData.publicKey,
      hasSecretKey: !!(walletData.secretKey && walletData.secretKey.trim() !== ''),
      hasPrivateKey: walletData.hasPrivateKey,
      secretKeyLength: walletData.secretKey ? walletData.secretKey.length : 0,
    });

    return walletData;
  }
  
  console.log('❌ No wallet data found in Supabase for pool:', poolAddress);
  return null;
};

// Admin settings operations
export const getAdminSettings = async (userWallet: string): Promise<AdminSettings | null> => {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('user_wallet', userWallet)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// CRITICAL FIX: Get global platform branding from any admin user (for display when no wallet connected)
export const getGlobalPlatformBranding = async (): Promise<{
  platform_name: string;
  platform_description: string;
  platform_icon: string;
  platform_active?: boolean;
  maintenance_message?: string;
  network?: 'devnet' | 'mainnet-beta';
} | null> => {
  try {
    console.log('🌍 Fetching global platform branding from admin_settings...');
    
    // Get the most recent admin settings that have platform branding configured
    const { data, error } = await supabase
      .from('admin_settings')
      .select('platform_name, platform_description, platform_icon, platform_active, maintenance_message, network')
      .not('platform_name', 'is', null)
      .not('platform_description', 'is', null)
      .not('platform_icon', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching global platform branding:', error);
      return null;
    }

    if (data) {
      console.log('✅ Global platform branding found:', data);
      return {
        platform_name: data.platform_name || 'Swapper',
        platform_description: data.platform_description || 'Real NFT Exchange',
        platform_icon: data.platform_icon || '⚡',
        platform_active: data.platform_active,
        maintenance_message: data.maintenance_message,
        network: data.network,
      };
    }

    console.log('⚠️ No global platform branding found');
    return null;
  } catch (error) {
    console.error('❌ Error in getGlobalPlatformBranding:', error);
    return null;
  }
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
      platform_name: settings.platform_name,
      platform_description: settings.platform_description,
      platform_icon: settings.platform_icon,
    }], {
      onConflict: 'user_wallet'
    })
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
    .maybeSingle();

  if (error) throw error;
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
    }], {
      onConflict: 'user_wallet'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ENHANCED: Complete localStorage cleanup
export const cleanupLocalStorage = () => {
  console.log('🧹 Performing COMPLETE localStorage cleanup...');
  
  // Get all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }
  
  console.log('Found localStorage keys:', allKeys);
  
  // Remove ALL swapper-related keys
  const swapperKeys = allKeys.filter(key => 
    key.includes('swapper') || 
    key.includes('pool') || 
    key.includes('admin') || 
    key.includes('api') ||
    key.includes('wallet') ||
    key.includes('network') ||
    key.includes('program')
  );
  
  swapperKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed ${key} from localStorage`);
  });
  
  // Also remove any remaining specific keys
  const specificKeys = [
    'swapper_pools',
    'swapper_admin_settings', 
    'swapper_api_config',
    'swapper_network',
    'swapper_program_id',
    'swapper-collection.json',
    '.swapper-wallet.json'
  ];
  
  specificKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed specific key: ${key}`);
    }
  });
  
  console.log('✅ Complete localStorage cleanup finished');
};

// ENHANCED: Remove any default/test pools from database
export const removeTestPools = async () => {
  try {
    console.log('🧹 Removing test pools from database...');
    
    // Remove SwapperCollection and other test pools
    const testPoolIds = [
      'swapper-collection',
      'test-collection',
      'test-collection-1',
      'solana-monkey-business',
      'degenerate-ape-academy',
      'aurory',
      'okay-bears',
      'thugbirdz'
    ];
    
    for (const poolId of testPoolIds) {
      const { error } = await supabase
        .from('pools')
        .delete()
        .eq('collection_id', poolId);
      
      if (error) {
        console.log(`Pool ${poolId} not found or already deleted`);
      } else {
        console.log(`✅ Removed test pool: ${poolId}`);
      }
    }
    
    console.log('✅ Test pool cleanup completed');
  } catch (error) {
    console.error('Error removing test pools:', error);
  }
};

// Migration utilities - ENHANCED
export const migrateFromLocalStorage = async (userWallet: string) => {
  try {
    console.log('🔄 Starting ENHANCED migration from localStorage to Supabase...');

    // FIRST: Clean up any existing test data
    await removeTestPools();
    
    // Check if migration is needed
    const hasLocalData = localStorage.getItem('swapper_pools') || 
                        localStorage.getItem('swapper_admin_settings') || 
                        localStorage.getItem('swapper_api_config');
    
    if (!hasLocalData) {
      console.log('No localStorage data found, performing cleanup only');
      cleanupLocalStorage();
      return false;
    }

    // Migrate admin settings
    const adminSettings = localStorage.getItem('swapper_admin_settings');
    if (adminSettings) {
      try {
        const settings = JSON.parse(adminSettings);
        await saveAdminSettings({
          user_wallet: userWallet,
          fee_collector_wallet: settings.feeCollectorWallet || userWallet,
          default_swap_fee: parseFloat(settings.defaultSwapFee) || 0.05,
          platform_active: settings.platformActive !== false,
          maintenance_message: settings.maintenanceMessage || 'Platform is currently under maintenance.',
          helius_api_key: settings.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1',
          network: settings.network || 'devnet',
        });
        console.log('✅ Admin settings migrated');
      } catch (error) {
        console.error('Error migrating admin settings:', error);
      }
    }

    // Migrate API config
    const apiConfig = localStorage.getItem('swapper_api_config');
    if (apiConfig) {
      try {
        const config = JSON.parse(apiConfig);
        await saveApiConfig({
          user_wallet: userWallet,
          helius_api_key: config.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1',
          helius_rpc: config.heliusRpc || 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
          network: config.network || 'devnet',
        });
        console.log('✅ API config migrated');
      } catch (error) {
        console.error('Error migrating API config:', error);
      }
    }

    // Migrate pools (but skip test pools)
    const pools = localStorage.getItem('swapper_pools');
    if (pools) {
      try {
        const poolsData = JSON.parse(pools);
        for (const [collectionId, pool] of Object.entries(poolsData)) {
          // Skip test pools
          if (collectionId.includes('test') || collectionId.includes('swapper-collection')) {
            console.log(`Skipping test pool: ${collectionId}`);
            continue;
          }
          
          const poolConfig = pool as any;
          
          // Check if pool already exists
          const existingPool = await getPool(collectionId);
          if (existingPool) {
            console.log(`Pool ${collectionId} already exists, skipping`);
            continue;
          }
          
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
        console.log('✅ Pools migrated (test pools skipped)');
      } catch (error) {
        console.error('Error migrating pools:', error);
      }
    }

    // Migrate individual pool wallet data (skip test pools)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pool_wallet_')) {
        const poolAddress = key.replace('pool_wallet_', '');
        
        // Skip if it looks like a test pool address
        if (poolAddress.includes('test') || poolAddress.includes('SwapPool')) {
          console.log(`Skipping test pool wallet: ${poolAddress}`);
          continue;
        }
        
        const walletData = localStorage.getItem(key);
        if (walletData) {
          try {
            const data = JSON.parse(walletData);
            await storePoolWallet(poolAddress, {
              publicKey: data.publicKey,
              secretKey: data.secretKey,
              hasPrivateKey: true,
            });
          } catch (error) {
            console.error(`Error migrating wallet data for ${poolAddress}:`, error);
          }
        }
      }
    }

    // FINAL: Complete cleanup after migration
    cleanupLocalStorage();

    console.log('🎉 Enhanced migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Still clean up localStorage even if migration fails
    cleanupLocalStorage();
    throw error;
  }
};

// Force cleanup function for admin use
export const forceCleanup = async () => {
  console.log('🧹 FORCE CLEANUP: Removing all test data...');
  
  // Clean localStorage
  cleanupLocalStorage();
  
  // Clean database test pools
  await removeTestPools();
  
  console.log('✅ Force cleanup completed');
};