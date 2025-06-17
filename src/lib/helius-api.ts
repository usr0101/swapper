// Simplified Helius API integration
import { Connection } from '@solana/web3.js';

const DEFAULT_API_KEY = 'd260d547-850c-4cb6-8412-9c764f0c9df1';
const DEFAULT_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${DEFAULT_API_KEY}`;

export const heliusConnection = new Connection(DEFAULT_RPC_URL, 'confirmed');

// Get NFTs owned by a wallet
export const getWalletNFTs = async (walletAddress: string) => {
  try {
    const response = await fetch(DEFAULT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-assets',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: { showFungible: false, showNativeBalance: false },
        },
      }),
    });

    const data = await response.json();
    
    if (data.result?.items) {
      return data.result.items
        .filter((item: any) => item.interface === 'V1_NFT')
        .map(formatHeliusNFT)
        .filter((nft: any) => nft.image && !nft.image.includes('placeholder'));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
};

// Get wallet balance
export const getWalletBalance = async (walletAddress: string) => {
  try {
    const response = await fetch(DEFAULT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-balance',
        method: 'getBalance',
        params: [walletAddress],
      }),
    });

    const data = await response.json();
    return data.result ? data.result.value / 1e9 : 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

// Search NFT by mint address
export const searchNFTByMint = async (mintAddress: string) => {
  try {
    const response = await fetch(DEFAULT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: mintAddress },
      }),
    });

    const data = await response.json();
    return data.result ? formatHeliusNFT(data.result) : null;
  } catch (error) {
    console.error('Error searching NFT:', error);
    return null;
  }
};

// Format NFT data
const formatHeliusNFT = (asset: any) => {
  const metadata = asset.content?.metadata;
  const attributes = metadata?.attributes || [];
  
  let imageUrl = asset.content?.files?.[0]?.uri || metadata?.image || '';
  
  if (imageUrl.startsWith('ipfs://')) {
    imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  
  if (!imageUrl) {
    imageUrl = 'https://via.placeholder.com/400x400/6366f1/ffffff?text=NFT';
  }
  
  return {
    id: asset.id,
    name: metadata?.name || `NFT ${asset.id.slice(0, 8)}`,
    collection: asset.grouping?.[0]?.group_value || 'unknown',
    image: imageUrl,
    mint: asset.id,
    rarity: attributes.length >= 6 ? 'Rare' : 'Common',
    traits: attributes.length,
    attributes,
    description: metadata?.description || '',
    owner: asset.ownership?.owner || null,
  };
};

export const getCurrentNetworkInfo = () => ({
  network: 'devnet',
  rpcUrl: DEFAULT_RPC_URL,
  explorerUrl: 'https://explorer.solana.com',
});