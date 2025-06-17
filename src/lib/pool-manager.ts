import { supabase, createPool, getAllPools as getPoolsFromDB, getPool as getPoolFromDB, updatePoolStats as updatePoolStatsDB, togglePoolStatus, deletePool as deletePoolFromDB, storePoolWallet, getPoolWalletData as getPoolWalletFromDB, PoolConfig } from './supabase';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { heliusConnection } from './helius-api';

class PoolManager {
  private connection: Connection;

  constructor() {
    this.connection = heliusConnection;
  }

  // Generate a REAL Solana wallet address for the pool
  private async generatePoolAddress(): Promise<{
    publicKey: string;
    secretKey: string;
  }> {
    try {
      const poolKeypair = Keypair.generate();
      
      return {
        publicKey: poolKeypair.publicKey.toString(),
        secretKey: Array.from(poolKeypair.secretKey).join(','),
      };
    } catch (error) {
      console.error('Error generating pool address:', error);
      throw new Error('Failed to generate pool address');
    }
  }

  // Create a new pool for a collection
  async createPool(
    collectionId: string,
    collectionName: string,
    collectionSymbol: string,
    collectionImage: string,
    collectionAddress: string,
    creatorWallet: string,
    swapFee: number = 0.05,
    description?: string,
    poolAddress?: string,
    poolWalletData?: any
  ): Promise<PoolConfig> {
    try {
      // Check if pool already exists
      const existingPool = await getPoolFromDB(collectionId);
      if (existingPool) {
        throw new Error('Pool already exists for this collection');
      }

      let finalPoolAddress = poolAddress;
      let finalPoolWalletData = null;

      // If no pool address provided, generate one
      if (!finalPoolAddress) {
        const walletData = await this.generatePoolAddress();
        finalPoolAddress = walletData.publicKey;
        finalPoolWalletData = {
          publicKey: walletData.publicKey,
          secretKey: walletData.secretKey,
          hasPrivateKey: true,
        };
      } else if (poolWalletData) {
        finalPoolWalletData = {
          publicKey: poolWalletData.publicKey,
          secretKey: poolWalletData.secretKey,
          hasPrivateKey: true,
        };
      } else {
        finalPoolWalletData = {
          publicKey: finalPoolAddress,
          secretKey: '',
          hasPrivateKey: false,
        };
      }

      console.log('Creating pool with address:', finalPoolAddress);

      // Create pool in database
      const poolConfig = await createPool({
        collection_id: collectionId,
        collection_name: collectionName,
        collection_symbol: collectionSymbol,
        collection_image: collectionImage,
        collection_address: collectionAddress,
        pool_address: finalPoolAddress,
        swap_fee: swapFee,
        created_by: creatorWallet,
        is_active: true,
        nft_count: 0,
        total_volume: 0,
        description: description || `Swap pool for ${collectionName} NFTs`,
      });

      // Store wallet data securely if we have private key
      if (finalPoolWalletData?.hasPrivateKey && finalPoolWalletData.secretKey) {
        await storePoolWallet(finalPoolAddress, finalPoolWalletData);
      }

      console.log('Pool created successfully:', poolConfig);
      return poolConfig;

    } catch (error) {
      console.error('Error creating pool:', error);
      throw error;
    }
  }

  // Get all pools
  async getAllPools(): Promise<PoolConfig[]> {
    return await getPoolsFromDB();
  }

  // Get pool by collection ID
  async getPool(collectionId: string): Promise<PoolConfig | null> {
    return await getPoolFromDB(collectionId);
  }

  // Update pool stats
  async updatePoolStats(collectionId: string, nftCount: number, volume: number = 0): Promise<boolean> {
    try {
      console.log(`Updating pool stats for ${collectionId}: NFT count -> ${nftCount}`);
      await updatePoolStatsDB(collectionId, nftCount, volume);
      console.log(`Pool stats updated successfully for ${collectionId}`);
      return true;
    } catch (error) {
      console.error('Error updating pool stats:', error);
      return false;
    }
  }

  // Update pool NFT count specifically
  async updatePoolNFTCount(collectionId: string): Promise<number> {
    try {
      const { getPoolNFTs } = await import('./solana');
      
      console.log(`Fetching real NFT count for pool: ${collectionId}`);
      const poolNFTs = await getPoolNFTs(collectionId);
      const actualCount = poolNFTs.length;
      
      console.log(`Found ${actualCount} NFTs in pool ${collectionId}`);
      await this.updatePoolStats(collectionId, actualCount);
      
      return actualCount;
    } catch (error) {
      console.error(`Error updating NFT count for pool ${collectionId}:`, error);
      return 0;
    }
  }

  // Refresh all pool NFT counts
  async refreshAllPoolCounts(): Promise<void> {
    console.log('Refreshing NFT counts for all pools...');
    
    const pools = await this.getAllPools();
    const updatePromises = pools.map(pool => 
      this.updatePoolNFTCount(pool.collection_id)
    );
    
    try {
      await Promise.all(updatePromises);
      console.log('All pool NFT counts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing pool counts:', error);
    }
  }

  // Toggle pool active status
  async togglePoolStatus(collectionId: string): Promise<boolean> {
    try {
      await togglePoolStatus(collectionId);
      return true;
    } catch (error) {
      console.error('Error toggling pool status:', error);
      return false;
    }
  }

  // Delete pool
  async deletePool(collectionId: string): Promise<boolean> {
    try {
      await deletePoolFromDB(collectionId);
      return true;
    } catch (error) {
      console.error('Error deleting pool:', error);
      return false;
    }
  }

  // Get pool statistics
  async getPoolStats(): Promise<{
    totalPools: number;
    activePools: number;
    totalNFTs: number;
    totalVolume: number;
  }> {
    const pools = await this.getAllPools();
    return {
      totalPools: pools.length,
      activePools: pools.filter(p => p.is_active).length,
      totalNFTs: pools.reduce((sum, p) => sum + p.nft_count, 0),
      totalVolume: pools.reduce((sum, p) => sum + p.total_volume, 0),
    };
  }

  // Get pool wallet data
  async getPoolWalletData(poolAddress: string): Promise<any> {
    return await getPoolWalletFromDB(poolAddress);
  }

  // Validate collection address
  async validateCollection(collectionAddress: string): Promise<boolean> {
    try {
      if (!collectionAddress || collectionAddress.trim() === '') {
        return false;
      }
      
      const pubkey = new PublicKey(collectionAddress);
      const accountInfo = await this.connection.getAccountInfo(pubkey);
      return accountInfo !== null;
    } catch (error) {
      console.error('Invalid collection address:', error);
      return false;
    }
  }

  // Get collection metadata from blockchain
  async getCollectionMetadata(collectionAddress: string): Promise<any> {
    try {
      return {
        name: 'Unknown Collection',
        symbol: 'UNK',
        image: 'https://via.placeholder.com/400',
        description: 'Collection metadata not available',
      };
    } catch (error) {
      console.error('Error fetching collection metadata:', error);
      return null;
    }
  }

  // Export pool wallet (for backup purposes)
  async exportPoolWallet(poolAddress: string): Promise<string | null> {
    const walletData = await this.getPoolWalletData(poolAddress);
    if (!walletData) return null;

    return JSON.stringify({
      publicKey: walletData.publicKey,
      secretKey: walletData.secretKey,
      exportedAt: new Date().toISOString(),
      warning: 'Keep this data secure! Anyone with the secret key can control this wallet.',
    }, null, 2);
  }

  // Import pool wallet
  async importPoolWallet(poolAddress: string, walletDataJson: string): Promise<boolean> {
    try {
      const walletData = JSON.parse(walletDataJson);
      
      if (!walletData.publicKey || !walletData.secretKey) {
        throw new Error('Invalid wallet data format');
      }

      if (walletData.publicKey !== poolAddress) {
        throw new Error('Public key does not match pool address');
      }

      await storePoolWallet(poolAddress, walletData);
      return true;
    } catch (error) {
      console.error('Error importing pool wallet:', error);
      return false;
    }
  }
}

// Export singleton instance
export const poolManager = new PoolManager();

// Export utility functions
export const createNewPool = async (
  collectionId: string,
  collectionName: string,
  collectionSymbol: string,
  collectionImage: string,
  collectionAddress: string,
  creatorWallet: string,
  swapFee?: number,
  description?: string,
  poolAddress?: string,
  poolWalletData?: any
) => {
  return await poolManager.createPool(
    collectionId,
    collectionName,
    collectionSymbol,
    collectionImage,
    collectionAddress,
    creatorWallet,
    swapFee,
    description,
    poolAddress,
    poolWalletData
  );
};

export const getAllPools = () => poolManager.getAllPools();
export const getPool = (collectionId: string) => poolManager.getPool(collectionId);
export const updatePoolStats = (collectionId: string, nftCount: number, volume: number = 0) => 
  poolManager.updatePoolStats(collectionId, nftCount, volume);
export const getPoolStats = () => poolManager.getPoolStats();
export const getPoolWalletData = (poolAddress: string) => poolManager.getPoolWalletData(poolAddress);
export const exportPoolWallet = (poolAddress: string) => poolManager.exportPoolWallet(poolAddress);
export const importPoolWallet = (poolAddress: string, walletData: string) => 
  poolManager.importPoolWallet(poolAddress, walletData);
export const updatePoolNFTCount = (collectionId: string) => poolManager.updatePoolNFTCount(collectionId);
export const refreshAllPoolCounts = () => poolManager.refreshAllPoolCounts();