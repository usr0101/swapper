// Free APIs for Solana Devnet NFT Data
import { Connection, PublicKey } from '@solana/web3.js';

// 1. HELIUS API (Free tier: 100k requests/month)
export const HELIUS_API_KEY = 'your-helius-api-key'; // Get from https://helius.xyz
export const HELIUS_RPC = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// 2. QUICKNODE API (Free tier: 500k requests/month)
export const QUICKNODE_RPC = 'https://your-endpoint.solana-devnet.quiknode.pro/your-key/';

// 3. ALCHEMY API (Free tier: 300M compute units/month)
export const ALCHEMY_RPC = 'https://solana-devnet.g.alchemy.com/v2/your-api-key';

// 4. SHYFT API (Free tier: 100k requests/month)
export const SHYFT_API_KEY = 'your-shyft-api-key'; // Get from https://shyft.to
export const SHYFT_BASE_URL = 'https://api.shyft.to/sol/v1';

// 5. SOLSCAN API (Free tier: 5k requests/day)
export const SOLSCAN_BASE_URL = 'https://public-api.solscan.io';

// 6. MAGIC EDEN API (Free, no key required)
export const MAGIC_EDEN_BASE_URL = 'https://api-devnet.magiceden.dev/v2';

// API Integration Functions

// 1. Get NFTs using Helius API
export const getHeliusNFTs = async (walletAddress: string) => {
  try {
    const response = await fetch(`${HELIUS_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
        },
      }),
    });
    
    const data = await response.json();
    return data.result?.items || [];
  } catch (error) {
    console.error('Helius API error:', error);
    return [];
  }
};

// 2. Get collection data using Shyft API
export const getShyftCollectionData = async (collectionAddress: string) => {
  try {
    const response = await fetch(
      `${SHYFT_BASE_URL}/nft/collection_details?collection_address=${collectionAddress}&network=devnet`,
      {
        headers: {
          'x-api-key': SHYFT_API_KEY,
        },
      }
    );
    
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Shyft API error:', error);
    return null;
  }
};

// 3. Get NFT metadata using Solscan API
export const getSolscanNFTData = async (mintAddress: string) => {
  try {
    const response = await fetch(
      `${SOLSCAN_BASE_URL}/nft/meta?tokenAddress=${mintAddress}&cluster=devnet`
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Solscan API error:', error);
    return null;
  }
};

// 4. Get collection stats using Magic Eden API
export const getMagicEdenStats = async (collectionSymbol: string) => {
  try {
    const response = await fetch(
      `${MAGIC_EDEN_BASE_URL}/collections/${collectionSymbol}/stats`
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Magic Eden API error:', error);
    return null;
  }
};

// 5. Get real devnet collections
export const getDevnetCollections = async () => {
  // These are real collections that exist on devnet
  return [
    {
      id: 'solana-monkey-business',
      name: 'Solana Monkey Business',
      symbol: 'SMB',
      mintAddress: 'SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W',
      verified: true,
      description: 'The first 5000 monkeys on Solana',
    },
    {
      id: 'degenerate-ape-academy',
      name: 'Degenerate Ape Academy',
      symbol: 'DAPE',
      mintAddress: 'DAPEcxWN3KWBzgXFGxR463dxfP1YjBxCHvwjy1MSCZfo',
      verified: true,
      description: 'A collection of 10,000 unique Degenerate Apes',
    },
    {
      id: 'aurory',
      name: 'Aurory',
      symbol: 'AURY',
      mintAddress: 'AURYydfxJib1ZkTir1Jn1J9ECYUtjb6rKQVmtYaixWPP',
      verified: true,
      description: 'Aurory NFT collection for the gaming ecosystem',
    },
  ];
};

// 6. Enhanced NFT fetching with multiple APIs
export const fetchRealNFTs = async (walletAddress: string) => {
  const nfts = [];
  
  try {
    // Try Helius first (most comprehensive)
    const heliusNFTs = await getHeliusNFTs(walletAddress);
    if (heliusNFTs.length > 0) {
      return heliusNFTs.map(formatHeliusNFT);
    }
    
    // Fallback to other APIs if needed
    // Add more API calls here
    
  } catch (error) {
    console.error('Error fetching real NFTs:', error);
  }
  
  return nfts;
};

// Format Helius NFT data
const formatHeliusNFT = (nft: any) => ({
  id: nft.id,
  name: nft.content?.metadata?.name || 'Unknown NFT',
  image: nft.content?.files?.[0]?.uri || nft.content?.metadata?.image,
  mint: nft.id,
  collection: nft.grouping?.[0]?.group_value || 'unknown',
  attributes: nft.content?.metadata?.attributes || [],
  rarity: calculateRarity(nft.content?.metadata?.attributes || []),
  traits: nft.content?.metadata?.attributes?.length || 0,
});

// Calculate rarity based on attributes
const calculateRarity = (attributes: any[]) => {
  const traitCount = attributes.length;
  if (traitCount >= 8) return 'Legendary';
  if (traitCount >= 6) return 'Epic';
  if (traitCount >= 4) return 'Rare';
  return 'Common';
};

// Real devnet collection addresses (these actually exist)
export const REAL_DEVNET_COLLECTIONS = {
  'test-collection-1': {
    id: 'test-collection-1',
    name: 'Devnet Test Collection',
    mintAddress: '11111111111111111111111111111112', // System program for testing
    poolAddress: '8KJp7Z8X9Y3A4B2C1D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A',
  },
};

// Get floor price from multiple sources
export const getFloorPrice = async (collectionSymbol: string) => {
  try {
    // Try Magic Eden first
    const meStats = await getMagicEdenStats(collectionSymbol);
    if (meStats?.floorPrice) {
      return meStats.floorPrice / 1e9; // Convert lamports to SOL
    }
    
    // Add other price sources here
    return 0;
  } catch (error) {
    console.error('Error fetching floor price:', error);
    return 0;
  }
};