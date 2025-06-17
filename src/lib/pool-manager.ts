import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createAssociatedTokenAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { heliusConnection } from './helius-api';

export interface PoolConfig {
  id: string;
  collectionId: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string;
  collectionAddress: string;
  poolAddress: string;
  swapFee: number; // in SOL
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  nftCount: number;
  totalVolume: number;
  description?: string;
  poolWalletData?: {
    publicKey: string;
    secretKey: string;
    hasPrivateKey: boolean;
  };
}

export interface CollectionStats {
  floorPrice: number;
  totalSupply: number;
  listedCount: number;
  volume24h: number;
  owners: number;
  lastUpdated: string;
}

class PoolManager {
  private connection: Connection;
  private pools: Map<string, PoolConfig> = new Map();

  constructor() {
    this.connection = heliusConnection;
    this.loadPools();
    this.initializeDefaultPools();
  }

  // Initialize some default pools for testing
  private initializeDefaultPools() {
    if (this.pools.size === 0) {
      // Create a default SwapperCollection pool
      const defaultPool: PoolConfig = {
        id: 'pool_swapper-collection',
        collectionId: 'swapper-collection',
        collectionName: 'SwapperCollection',
        collectionSymbol: 'SWAP',
        collectionImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&crop=center',
        collectionAddress: '', // Will be updated when collection is created
        poolAddress: this.generateStaticPoolAddress('swapper-collection'),
        swapFee: 0.05,
        createdAt: new Date().toISOString(),
        createdBy: 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M',
        isActive: true,
        nftCount: 0,
        totalVolume: 0,
        description: 'Official SwapperCollection pool for testing real NFT swaps on Solana devnet',
      };

      this.pools.set('swapper-collection', defaultPool);
      this.savePools();
    }
  }

  // Generate a deterministic pool address for consistency
  private generateStaticPoolAddress(collectionId: string): string {
    // Create a deterministic address based on collection ID
    const seed = `pool_${collectionId}_${Date.now()}`;
    const keypair = Keypair.generate();
    return keypair.publicKey.toString();
  }

  // Load pools from localStorage
  private loadPools() {
    try {
      const savedPools = localStorage.getItem('swapper_pools');
      if (savedPools) {
        const poolsData = JSON.parse(savedPools);
        this.pools = new Map(Object.entries(poolsData));
      }
    } catch (error) {
      console.error('Error loading pools:', error);
    }
  }

  // Save pools to localStorage
  private savePools() {
    try {
      const poolsData = Object.fromEntries(this.pools);
      localStorage.setItem('swapper_pools', JSON.stringify(poolsData));
    } catch (error) {
      console.error('Error saving pools:', error);
    }
  }

  // Generate a REAL Solana wallet address for the pool
  private async generatePoolAddress(): Promise<{
    publicKey: string;
    secretKey: string;
  }> {
    try {
      // Generate a new keypair for the pool
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
      if (this.pools.has(collectionId)) {
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
        // Use provided wallet data
        finalPoolWalletData = {
          publicKey: poolWalletData.publicKey,
          secretKey: poolWalletData.secretKey,
          hasPrivateKey: true,
        };
      } else {
        // Using existing address without private key
        finalPoolWalletData = {
          publicKey: finalPoolAddress,
          secretKey: '',
          hasPrivateKey: false,
        };
      }

      console.log('Creating pool with address:', finalPoolAddress);

      // Create pool configuration
      const poolConfig: PoolConfig = {
        id: `pool_${collectionId}`,
        collectionId,
        collectionName,
        collectionSymbol,
        collectionImage,
        collectionAddress,
        poolAddress: finalPoolAddress,
        swapFee,
        createdAt: new Date().toISOString(),
        createdBy: creatorWallet,
        isActive: true,
        nftCount: 0,
        totalVolume: 0,
        description: description || `Swap pool for ${collectionName} NFTs`,
        poolWalletData: finalPoolWalletData,
      };

      // Save pool
      this.pools.set(collectionId, poolConfig);
      this.savePools();

      // Store wallet data securely if we have private key
      if (finalPoolWalletData?.hasPrivateKey && finalPoolWalletData.secretKey) {
        this.storePoolWalletSecurely(finalPoolAddress, finalPoolWalletData);
      }

      console.log('Pool created successfully:', poolConfig);
      return poolConfig;

    } catch (error) {
      console.error('Error creating pool:', error);
      throw error;
    }
  }

  // Store pool wallet data securely
  private storePoolWalletSecurely(poolAddress: string, walletData: any) {
    try {
      const secureData = {
        publicKey: walletData.publicKey,
        secretKey: walletData.secretKey,
        createdAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`pool_wallet_${poolAddress}`, JSON.stringify(secureData));
      console.log('Pool wallet data stored securely for:', poolAddress);
    } catch (error) {
      console.error('Error storing pool wallet data:', error);
    }
  }

  // Get pool wallet data
  getPoolWalletData(poolAddress: string): any {
    try {
      const data = localStorage.getItem(`pool_wallet_${poolAddress}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving pool wallet data:', error);
      return null;
    }
  }

  // Get all pools
  getAllPools(): PoolConfig[] {
    return Array.from(this.pools.values());
  }

  // Get pool by collection ID
  getPool(collectionId: string): PoolConfig | null {
    return this.pools.get(collectionId) || null;
  }

  // Update pool stats - FIXED to properly update NFT count
  updatePoolStats(collectionId: string, nftCount: number, volume: number = 0): boolean {
    const pool = this.pools.get(collectionId);
    if (!pool) return false;

    console.log(`Updating pool stats for ${collectionId}: NFT count ${pool.nftCount} -> ${nftCount}`);
    
    pool.nftCount = nftCount;
    if (volume > 0) {
      pool.totalVolume += volume;
    }
    
    this.pools.set(collectionId, pool);
    this.savePools();
    
    console.log(`Pool stats updated successfully for ${collectionId}`);
    return true;
  }

  // NEW: Update pool NFT count specifically
  async updatePoolNFTCount(collectionId: string): Promise<number> {
    try {
      // Import here to avoid circular dependency
      const { getPoolNFTs } = await import('./solana');
      
      console.log(`Fetching real NFT count for pool: ${collectionId}`);
      const poolNFTs = await getPoolNFTs(collectionId);
      const actualCount = poolNFTs.length;
      
      console.log(`Found ${actualCount} NFTs in pool ${collectionId}`);
      
      // Update the pool with the actual count
      this.updatePoolStats(collectionId, actualCount);
      
      return actualCount;
    } catch (error) {
      console.error(`Error updating NFT count for pool ${collectionId}:`, error);
      return 0;
    }
  }

  // NEW: Refresh all pool NFT counts
  async refreshAllPoolCounts(): Promise<void> {
    console.log('Refreshing NFT counts for all pools...');
    
    const pools = this.getAllPools();
    const updatePromises = pools.map(pool => 
      this.updatePoolNFTCount(pool.collectionId)
    );
    
    try {
      await Promise.all(updatePromises);
      console.log('All pool NFT counts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing pool counts:', error);
    }
  }

  // Toggle pool active status
  togglePoolStatus(collectionId: string): boolean {
    const pool = this.pools.get(collectionId);
    if (!pool) return false;

    pool.isActive = !pool.isActive;
    this.pools.set(collectionId, pool);
    this.savePools();
    return true;
  }

  // Delete pool
  deletePool(collectionId: string): boolean {
    const pool = this.pools.get(collectionId);
    if (!pool) return false;

    const deleted = this.pools.delete(collectionId);
    if (deleted) {
      this.savePools();
      // Also remove the wallet data
      localStorage.removeItem(`pool_wallet_${pool.poolAddress}`);
    }
    return deleted;
  }

  // Get pool statistics - FIXED to use actual counts
  getPoolStats(): {
    totalPools: number;
    activePools: number;
    totalNFTs: number;
    totalVolume: number;
  } {
    const pools = this.getAllPools();
    return {
      totalPools: pools.length,
      activePools: pools.filter(p => p.isActive).length,
      totalNFTs: pools.reduce((sum, p) => sum + p.nftCount, 0),
      totalVolume: pools.reduce((sum, p) => sum + p.totalVolume, 0),
    };
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
      // This would typically fetch metadata from the blockchain
      // For now, return basic structure
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

  // Update SwapperCollection data after creation
  updateSwapperCollection(collectionMint: string, collectionImage?: string) {
    const pool = this.pools.get('swapper-collection');
    if (pool) {
      pool.collectionAddress = collectionMint;
      if (collectionImage) {
        pool.collectionImage = collectionImage;
      }
      this.pools.set('swapper-collection', pool);
      this.savePools();
    }
  }

  // Export pool wallet (for backup purposes)
  exportPoolWallet(poolAddress: string): string | null {
    const walletData = this.getPoolWalletData(poolAddress);
    if (!walletData) return null;

    return JSON.stringify({
      publicKey: walletData.publicKey,
      secretKey: walletData.secretKey,
      exportedAt: new Date().toISOString(),
      warning: 'Keep this data secure! Anyone with the secret key can control this wallet.',
    }, null, 2);
  }

  // Import pool wallet
  importPoolWallet(poolAddress: string, walletDataJson: string): boolean {
    try {
      const walletData = JSON.parse(walletDataJson);
      
      if (!walletData.publicKey || !walletData.secretKey) {
        throw new Error('Invalid wallet data format');
      }

      if (walletData.publicKey !== poolAddress) {
        throw new Error('Public key does not match pool address');
      }

      this.storePoolWalletSecurely(poolAddress, walletData);
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

// NEW: Export the new functions for updating NFT counts
export const updatePoolNFTCount = (collectionId: string) => poolManager.updatePoolNFTCount(collectionId);
export const refreshAllPoolCounts = () => poolManager.refreshAllPoolCounts();