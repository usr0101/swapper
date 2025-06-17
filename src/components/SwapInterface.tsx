import React, { useState, useEffect } from 'react';
import { NFTCard } from './NFTCard';
import { SwapModal } from './SwapModal';
import { ArrowRightLeft, Search, ArrowLeft, AlertTriangle, Loader2, RefreshCw, Upload, ExternalLink, Key } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getUserNFTs, getPoolNFTs, getCollectionData, getPoolNFTCount } from '../lib/solana';
import { getAllPools as getAllPoolsFromSupabase, updatePoolStats, getPoolWalletData } from '../lib/supabase';
import { PublicKey } from '@solana/web3.js';

// Define PoolConfig interface locally to match Supabase structure
interface PoolConfig {
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

export const SwapInterface: React.FC = () => {
  const { isConnected, platformActive, maintenanceMessage, address, isAdmin } = useWallet();
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoolNFT, setSelectedPoolNFT] = useState<any>(null);
  const [selectedUserNFT, setSelectedUserNFT] = useState<any>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [poolNFTs, setPoolNFTs] = useState<any[]>([]);
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [collectionStats, setCollectionStats] = useState<any>(null);
  const [availablePools, setAvailablePools] = useState<PoolConfig[]>([]);

  // Load available pools
  useEffect(() => {
    const loadPools = async () => {
      try {
        const pools = await getAllPoolsFromSupabase();
        const activePools = pools.filter(pool => pool.is_active);
        setAvailablePools(activePools);
      } catch (error) {
        console.error('Error loading pools:', error);
        setError('Failed to load pools. Please check your connection and try again.');
      }
    };

    loadPools();
  }, []);

  const filteredPools = availablePools.filter(pool => {
    const matchesSearch = !searchTerm || 
      pool.collection_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectedPool = availablePools.find(p => p.collection_id === selectedCollection);

  // CRITICAL FIX: Use Supabase directly for wallet data check
  const checkSwapCapability = async (pool: PoolConfig) => {
    if (!pool) {
      console.log('❌ No pool provided for swap capability check');
      return false;
    }
    
    console.log('🔍 [SwapInterface] Checking swap capability for pool:', pool.collection_id);
    console.log('Pool address:', pool.pool_address);
    
    try {
      // CRITICAL FIX: Use Supabase directly instead of pool manager
      const poolWalletData = await getPoolWalletData(pool.pool_address);
      
      console.log('🔍 [SwapInterface] Pool wallet data check results:');
      console.log('  - Wallet data found:', !!poolWalletData);
      
      if (poolWalletData) {
        console.log('  - Has secret key:', !!(poolWalletData.secretKey && poolWalletData.secretKey.trim() !== ''));
        console.log('  - Secret key length:', poolWalletData.secretKey ? poolWalletData.secretKey.length : 0);
        console.log('  - Has private key flag:', poolWalletData.hasPrivateKey);
        console.log('  - Public key matches:', poolWalletData.publicKey === pool.pool_address);
        
        // ENHANCED: More thorough validation
        const hasValidSecretKey = poolWalletData.secretKey && 
                                 poolWalletData.secretKey.trim() !== '' &&
                                 poolWalletData.secretKey.length > 10; // Basic length check
        
        const hasPrivateKeyFlag = poolWalletData.hasPrivateKey === true;
        
        const publicKeyMatches = poolWalletData.publicKey === pool.pool_address;
        
        console.log('  - Valid secret key:', hasValidSecretKey);
        console.log('  - Private key flag set:', hasPrivateKeyFlag);
        console.log('  - Public key matches pool:', publicKeyMatches);
        
        // Pool has swap capability if ALL conditions are met
        const hasCapability = hasValidSecretKey && hasPrivateKeyFlag && publicKeyMatches;
        
        console.log('✅ [SwapInterface] Final swap capability result:', hasCapability);
        
        if (!hasCapability) {
          console.log('❌ Swap capability failed because:');
          if (!hasValidSecretKey) console.log('  - Invalid or missing secret key');
          if (!hasPrivateKeyFlag) console.log('  - hasPrivateKey flag not set to true');
          if (!publicKeyMatches) console.log('  - Public key mismatch');
        }
        
        return hasCapability;
      } else {
        console.log('❌ No wallet data found for pool address:', pool.pool_address);
        return false;
      }
    } catch (error) {
      console.error('❌ [SwapInterface] Error checking swap capability:', error);
      return false;
    }
  };

  // CRITICAL FIX: Use proper loading state for swap capability
  const [hasSwapCapability, setHasSwapCapability] = useState<boolean | null>(null);
  const [checkingSwapCapability, setCheckingSwapCapability] = useState(false);

  // Check swap capability when pool is selected
  useEffect(() => {
    if (selectedPool) {
      console.log('🔄 Pool selected, checking swap capability...');
      setCheckingSwapCapability(true);
      setHasSwapCapability(null); // Reset to loading state
      
      checkSwapCapability(selectedPool).then((result) => {
        console.log('🎯 Swap capability check completed:', result);
        setHasSwapCapability(result);
        setCheckingSwapCapability(false);
      }).catch((error) => {
        console.error('Error checking swap capability:', error);
        setHasSwapCapability(false);
        setCheckingSwapCapability(false);
      });
    } else {
      setHasSwapCapability(null);
      setCheckingSwapCapability(false);
    }
  }, [selectedPool]);

  const canSwap = selectedPoolNFT && selectedUserNFT && hasSwapCapability === true;

  // Load real NFTs when collection is selected
  useEffect(() => {
    if (selectedCollection && isConnected && address) {
      loadRealNFTs();
    }
  }, [selectedCollection, isConnected, address]);

  const loadRealNFTs = async () => {
    if (!selectedCollection || !address) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading NFTs for collection:', selectedCollection);
      
      // Load collection stats
      const stats = await getCollectionData(selectedCollection);
      setCollectionStats(stats);
      
      // Load pool NFTs (only NFTs actually sent to the pool address)
      console.log('Fetching NFTs from pool address...');
      const poolNFTsData = await getPoolNFTs(selectedCollection);
      setPoolNFTs(poolNFTsData);
      console.log('Pool NFTs found:', poolNFTsData.length);

      // Update the pool's NFT count with the actual count
      if (poolNFTsData.length >= 0) {
        console.log('Updating pool NFT count to:', poolNFTsData.length);
        await updatePoolStats(selectedCollection, poolNFTsData.length);
      }

      // Load user's NFTs
      const userNFTsData = await getUserNFTs(new PublicKey(address), selectedCollection);
      setUserNFTs(userNFTsData);
      console.log('User NFTs found:', userNFTsData.length);
      
      if (userNFTsData.length === 0 && poolNFTsData.length === 0) {
        setError('No NFTs found. The pool is empty and you don\'t own any NFTs from this collection.');
      }
      
    } catch (error) {
      console.error('Error loading NFTs:', error);
      setError('Failed to load NFT data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (selectedCollection) {
      console.log('Refreshing NFT data and updating counts...');
      await loadRealNFTs();
      
      // Force refresh the pools list to show updated counts
      try {
        const refreshedPools = await getAllPoolsFromSupabase();
        const activePools = refreshedPools.filter(pool => pool.is_active);
        setAvailablePools(activePools);
      } catch (error) {
        console.error('Error refreshing pools:', error);
      }
      
      // ADDED: Re-check swap capability after refresh
      if (selectedPool) {
        console.log('🔄 Re-checking swap capability after refresh...');
        setCheckingSwapCapability(true);
        const newCapability = await checkSwapCapability(selectedPool);
        console.log('🎯 Updated swap capability:', newCapability);
        setHasSwapCapability(newCapability);
        setCheckingSwapCapability(false);
      }
    }
  };

  const handleSwap = () => {
    if (canSwap) {
      setShowSwapModal(true);
    }
  };

  const handleSwapComplete = async () => {
    setShowSwapModal(false);
    setSelectedPoolNFT(null);
    setSelectedUserNFT(null);
    // Refresh NFTs after swap and update counts
    await loadRealNFTs();
    
    // Refresh pools list to show updated counts
    try {
      const refreshedPools = await getAllPoolsFromSupabase();
      const activePools = refreshedPools.filter(pool => pool.is_active);
      setAvailablePools(activePools);
    } catch (error) {
      console.error('Error refreshing pools after swap:', error);
    }
  };

  const handleBackToCollections = () => {
    setSelectedCollection('');
    setSelectedPoolNFT(null);
    setSelectedUserNFT(null);
    setPoolNFTs([]);
    setUserNFTs([]);
    setError('');
    setCollectionStats(null);
    setHasSwapCapability(null);
    setCheckingSwapCapability(false);
  };

  // Show maintenance message if platform is inactive
  if (!platformActive) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Platform Under Maintenance</h2>
          <p className="text-gray-400 mb-6">
            {maintenanceMessage}
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowRightLeft className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6 text-sm sm:text-base">
            Connect your Solana wallet to start swapping NFTs on devnet.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm">
              <strong>Devnet Integration:</strong> This platform uses Solana devnet data via Helius API. 
              Get free devnet SOL from the{' '}
              <a 
                href="https://faucet.solana.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Solana Faucet
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4">
          NFT Swap Exchange
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
          {selectedCollection 
            ? `Swap your ${selectedPool?.collection_name} NFTs with a ${selectedPool?.swap_fee} SOL fee`
            : 'Choose a collection pool to start swapping NFTs on Solana devnet'
          }
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-200 text-sm">Live Devnet Data via Helius API</span>
          </div>
          {selectedCollection && (
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 text-blue-200 hover:bg-blue-500/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {!selectedCollection ? (
        /* Collection Selection View */
        <>
          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-200 font-medium">Error Loading Pools</p>
                  <p className="text-red-100/80 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pools Grid */}
          {filteredPools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredPools.map(pool => {
                return (
                  <div
                    key={pool.id}
                    onClick={() => setSelectedCollection(pool.collection_id)}
                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-200 cursor-pointer group transform hover:scale-105"
                  >
                    <div className="aspect-video relative overflow-hidden rounded-t-xl">
                      <img
                        src={pool.collection_image}
                        alt={pool.collection_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{pool.collection_name}</h3>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{pool.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-300">
                            <span>Fee: {pool.swap_fee} SOL</span>
                            <span>NFTs: {pool.nft_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : availablePools.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Active Pools</h3>
              <p className="text-gray-400 mb-4">
                No swap pools are currently available. Contact an admin to create pools.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-blue-200 text-sm">
                  <strong>Admin Access:</strong> Connect with the admin wallet to create and manage pools.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Pools Found</h3>
              <p className="text-gray-400">
                Try adjusting your search terms or browse all available pools.
              </p>
            </div>
          )}
        </>
      ) : (
        /* NFT Selection View */
        <>
          {/* Back Button and Pool Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <button
              onClick={handleBackToCollections}
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors self-start"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Pools</span>
            </button>
            
            {selectedPool && (
              <div className="flex items-center space-x-4">
                <img
                  src={selectedPool.collection_image}
                  alt={selectedPool.collection_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedPool.collection_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-400">
                    <span>Fee: {selectedPool.swap_fee} SOL</span>
                    {/* CRITICAL FIX: Show loading state while checking swap capability */}
                    {checkingSwapCapability ? (
                      <span className="text-blue-400 flex items-center space-x-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Checking...</span>
                      </span>
                    ) : null}
                    {collectionStats?.lastUpdated && (
                      <span className="text-green-400">• Live Data</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swap Capability Warning - Only show if definitely false, not while loading */}
          {hasSwapCapability === false && !checkingSwapCapability && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-200 font-medium">Swap Not Available</p>
                  <p className="text-red-100/80 text-sm mt-1">
                    This pool cannot execute swaps because the private key is not accessible. 
                    Contact the admin to restore pool access or recreate the pool with proper wallet configuration.
                  </p>
                  {isAdmin && (
                    <p className="text-yellow-200 text-sm mt-2">
                      <strong>Admin:</strong> Try recreating this pool to restore swap functionality.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-200 font-medium">Error Loading NFTs</p>
                  <p className="text-red-100/80 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Loading NFTs...</h3>
              <p className="text-gray-400">Fetching data from Solana devnet via Helius API</p>
            </div>
          ) : userNFTs.length === 0 && poolNFTs.length === 0 ? (
            /* No NFTs Found */
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Pool is Empty</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                This pool doesn't have any NFTs available for swapping yet.
              </p>
              
              {/* ADMIN-ONLY INSTRUCTIONS */}
              {isAdmin && selectedPool && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 max-w-lg mx-auto">
                  <p className="text-blue-200 text-sm mb-2">
                    <strong>Admin Instructions:</strong> To add NFTs to this pool:
                  </p>
                  <div className="text-left space-y-2 text-blue-100/80 text-sm">
                    <p>1. Send NFTs to pool address: <code className="bg-blue-500/20 px-2 py-1 rounded text-xs break-all">{selectedPool.pool_address}</code></p>
                    <p>2. NFTs will automatically appear in "Available for Swap"</p>
                    <p>3. Users can then swap their NFTs with pool NFTs</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                <button
                  onClick={handleRefresh}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  Refresh Data
                </button>
                <button
                  onClick={handleBackToCollections}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  Choose Different Pool
                </button>
              </div>
            </div>
          ) : (
            /* Swap Interface */
            <>
              <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Pool NFTs */}
                <div className="space-y-4 lg:space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl lg:text-2xl font-bold text-white">Available for Swap</h2>
                    <div className="bg-white/10 px-3 py-1 rounded-full">
                      <span className="text-sm text-gray-300">{poolNFTs.length} NFTs</span>
                    </div>
                  </div>

                  {poolNFTs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
                      {poolNFTs.map(nft => (
                        <NFTCard
                          key={nft.id}
                          nft={nft}
                          isSelected={selectedPoolNFT?.id === nft.id}
                          onSelect={() => setSelectedPoolNFT(nft)}
                          showSelectButton
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No NFTs available in pool</p>
                      <p className="text-gray-500 text-sm">Pool is empty - no NFTs available for swapping</p>
                    </div>
                  )}
                </div>

                {/* User NFTs */}
                <div className="space-y-4 lg:space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl lg:text-2xl font-bold text-white">Your NFTs</h2>
                    <div className="bg-white/10 px-3 py-1 rounded-full">
                      <span className="text-sm text-gray-300">{userNFTs.length} Owned</span>
                    </div>
                  </div>

                  {userNFTs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
                      {userNFTs.map(nft => (
                        <NFTCard
                          key={nft.id}
                          nft={nft}
                          isSelected={selectedUserNFT?.id === nft.id}
                          onSelect={() => setSelectedUserNFT(nft)}
                          showSelectButton
                          isOwned
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-gray-400">No NFTs found in your wallet</p>
                      <p className="text-gray-500 text-sm mt-2">Connect a wallet with devnet NFTs from this collection</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Action */}
              <div className="text-center space-y-4">
                {selectedPoolNFT && selectedUserNFT && selectedPool && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-400">You Give</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <img
                            src={selectedUserNFT.image}
                            alt={selectedUserNFT.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <p className="font-medium text-white text-sm">{selectedUserNFT.name}</p>
                        </div>
                      </div>
                      <ArrowRightLeft className={`h-6 w-6 ${hasSwapCapability === true ? 'text-green-400' : 'text-red-400'}`} />
                      <div className="text-center">
                        <p className="text-sm text-gray-400">You Get</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <img
                            src={selectedPoolNFT.image}
                            alt={selectedPoolNFT.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <p className="font-medium text-white text-sm">{selectedPoolNFT.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-4">
                      Swap Fee: <span className="text-white font-medium">{selectedPool.swap_fee} SOL</span>
                    </div>
                    {/* CRITICAL FIX: Show loading state while checking */}
                    {checkingSwapCapability ? (
                      <div className="text-blue-400 text-xs flex items-center justify-center space-x-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Checking swap capability...</span>
                      </div>
                    ) : hasSwapCapability === true ? (
                      <div className="text-green-400 text-xs flex items-center justify-center space-x-1">
                        <Key className="h-3 w-3" />
                        <span>Atomic swap available</span>
                      </div>
                    ) : hasSwapCapability === false ? (
                      <div className="text-red-400 text-xs flex items-center justify-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Swap not available</span>
                      </div>
                    ) : null}
                  </div>
                )}

                <button
                  onClick={handleSwap}
                  disabled={!canSwap || checkingSwapCapability}
                  className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 ${
                    canSwap && !checkingSwapCapability
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {checkingSwapCapability
                    ? 'Checking Pool Access...'
                    : !selectedPoolNFT && !selectedUserNFT
                    ? 'Select NFTs to Swap'
                    : hasSwapCapability === false
                    ? 'Swap Not Available'
                    : canSwap
                    ? 'Execute Atomic Swap'
                    : 'Select both NFTs to continue'
                  }
                </button>
                
                {hasSwapCapability === false && selectedPoolNFT && selectedUserNFT && !checkingSwapCapability && (
                  <p className="text-red-400 text-sm">
                    This pool cannot execute swaps. The private key is not accessible.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showSwapModal && selectedPoolNFT && selectedUserNFT && selectedPool && (
        <SwapModal
          poolNFT={selectedPoolNFT}
          userNFT={selectedUserNFT}
          swapFee={selectedPool.swap_fee}
          collectionId={selectedPool.collection_id}
          onConfirm={handleSwapComplete}
          onClose={() => setShowSwapModal(false)}
        />
      )}
    </div>
  );
};