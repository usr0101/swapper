import { Connection } from '@solana/web3.js';
import { getApiConfig } from './supabase';

// Dynamic Helius API configuration that updates based on network
const getHeliusConfig = async (userWallet?: string) => {
  try {
    if (userWallet) {
      const config = await getApiConfig(userWallet);
      if (config) {
        return {
          apiKey: config.helius_api_key,
          rpcUrl: config.helius_rpc,
          network: config.network,
        };
      }
    }
  } catch (error) {
    console.error('Error loading Helius config from Supabase:', error);
  }
  
  // Default to devnet
  return {
    apiKey: 'd260d547-850c-4cb6-8412-9c764f0c9df1',
    rpcUrl: 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
    network: 'devnet' as const,
  };
};

// Get current network from Supabase or default to devnet
const getCurrentNetwork = async (userWallet?: string): Promise<'devnet' | 'mainnet'> => {
  try {
    if (userWallet) {
      const config = await getApiConfig(userWallet);
      return config?.network === 'mainnet-beta' ? 'mainnet' : 'devnet';
    }
  } catch {
    // Fallback to devnet
  }
  return 'devnet';
};

// Dynamic Helius RPC URL that updates based on current network
const getHeliusRpcUrl = async (userWallet?: string) => {
  const config = await getHeliusConfig(userWallet);
  const network = config.network === 'mainnet-beta' ? 'mainnet' : 'devnet';
  return `https://${network}.helius-rpc.com/?api-key=${config.apiKey}`;
};

// Enhanced connection with dynamic Helius endpoint
export const heliusConnection = new Connection('https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1', 'confirmed');

// Update connection when network changes
export const updateHeliusConnection = async (userWallet?: string) => {
  const newRpcUrl = await getHeliusRpcUrl(userWallet);
  return new Connection(newRpcUrl, 'confirmed');
};

// Get NFTs owned by a wallet using Helius API
export const getWalletNFTs = async (walletAddress: string, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-assets',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
          },
        },
      }),
    });

    const data = await response.json();
    
    if (data.result && data.result.items) {
      const formattedNFTs = data.result.items
        .filter((item: any) => item.interface === 'V1_NFT')
        .map(formatHeliusNFT)
        .filter((nft: any) => nft.image && nft.image !== '' && nft.image !== 'https://via.placeholder.com/400?text=No+Image');
      
      return formattedNFTs;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching NFTs from Helius:', error);
    return [];
  }
};

// Get collection information using Helius API
const getCollectionInfo = async (collectionAddress: string, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-collection',
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: collectionAddress,
          page: 1,
          limit: 100,
        },
      }),
    });

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching collection info:', error);
    return null;
  }
};

// Get asset details by mint address
const getAssetDetails = async (mintAddress: string, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: {
          id: mintAddress,
        },
      }),
    });

    const data = await response.json();
    return data.result ? formatHeliusNFT(data.result) : null;
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return null;
  }
};

// Enhanced Image URL extraction function
const extractImageFromMetadata = (metadata: any, content: any) => {
  const imageKeys = [
    'image', 'img', 'picture', 'pic', 'photo', 'media', 'artwork', 'art',
    'imageUrl', 'image_url', 'imageUri', 'image_uri', 'mediaUrl', 'media_url',
    'thumbnail', 'thumb', 'avatar', 'icon', 'logo', 'banner', 'cover',
    'animation_url', 'animationUrl', 'video', 'gif', 'asset', 'file'
  ];
  
  const isImageUrl = (value: string) => {
    if (!value || typeof value !== 'string') return false;
    
    if (value.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?$/i)) return true;
    if (value.match(/(ipfs|arweave|cloudinary|imgur|unsplash|pexels|pixabay)/i)) return true;
    if (value.startsWith('data:image/')) return true;
    if (value.startsWith('ipfs://') || value.startsWith('ar://')) return true;
    
    return false;
  };
  
  const searchForImages = (obj: any, path = ''): string[] => {
    const foundImages: string[] = [];
    
    if (!obj || typeof obj !== 'object') return foundImages;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        const keyLower = key.toLowerCase();
        const isImageKey = imageKeys.some(imageKey => keyLower.includes(imageKey));
        
        if (isImageKey && isImageUrl(value)) {
          foundImages.push(value);
        } else if (isImageUrl(value)) {
          foundImages.push(value);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          foundImages.push(...searchForImages(item, `${currentPath}[${index}]`));
        });
      } else if (typeof value === 'object') {
        foundImages.push(...searchForImages(value, currentPath));
      }
    }
    
    return foundImages;
  };
  
  const metadataImages = searchForImages(metadata, 'metadata');
  const contentImages = searchForImages(content, 'content');
  const allImages = [...new Set([...metadataImages, ...contentImages])];
  
  if (allImages.length > 0) {
    const sortedImages = allImages.sort((a, b) => {
      const aScore = getImageQualityScore(a);
      const bScore = getImageQualityScore(b);
      return bScore - aScore;
    });
    
    return sortedImages[0];
  }
  
  return null;
};

const getImageQualityScore = (url: string): number => {
  let score = 0;
  
  if (url.match(/\d{3,4}x\d{3,4}/)) score += 10;
  if (url.match(/(large|big|full|original|high)/i)) score += 8;
  if (url.match(/(medium|med)/i)) score += 5;
  
  if (url.match(/\.png$/i)) score += 7;
  if (url.match(/\.jpg|\.jpeg$/i)) score += 6;
  if (url.match(/\.webp$/i)) score += 5;
  if (url.match(/\.gif$/i)) score += 4;
  if (url.match(/\.svg$/i)) score += 3;
  
  if (url.includes('arweave')) score += 8;
  if (url.includes('ipfs')) score += 7;
  if (url.includes('cloudinary')) score += 6;
  
  if (url.match(/(thumb|thumbnail|small|tiny|icon)/i)) score -= 5;
  
  return score;
};

// Format Helius NFT data to our standard format
const formatHeliusNFT = (asset: any) => {
  const metadata = asset.content?.metadata;
  const attributes = metadata?.attributes || [];
  
  let imageUrl = '';
  
  if (asset.content?.files && asset.content.files.length > 0) {
    const imageFile = asset.content.files.find((file: any) => {
      const uri = file.uri || '';
      const mime = file.mime || '';
      
      if (mime.startsWith('image/')) return true;
      if (uri.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) return true;
      
      return false;
    });
    
    if (imageFile) {
      imageUrl = imageFile.uri;
    } else {
      imageUrl = asset.content.files[0]?.uri || '';
    }
  }
  
  if (!imageUrl && metadata?.image) {
    imageUrl = metadata.image;
  }
  
  if (!imageUrl) {
    const scannedImage = extractImageFromMetadata(metadata, asset.content);
    if (scannedImage) {
      imageUrl = scannedImage;
    }
  }
  
  if (!imageUrl && asset.content?.links) {
    const imageLink = asset.content.links.image;
    if (imageLink) {
      imageUrl = imageLink;
    }
  }
  
  if (imageUrl) {
    if (imageUrl.startsWith('ipfs://')) {
      imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    
    if (imageUrl.startsWith('ar://')) {
      imageUrl = imageUrl.replace('ar://', 'https://arweave.net/');
    }
    
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    if (imageUrl.match(/^[^:\/]+\.(jpg|jpeg|png|gif|webp)/i)) {
      imageUrl = 'https://' + imageUrl;
    }
  }
  
  if (!imageUrl || imageUrl === '') {
    imageUrl = 'https://via.placeholder.com/400x400/6366f1/ffffff?text=NFT';
  }
  
  return {
    id: asset.id,
    name: metadata?.name || `NFT ${asset.id.slice(0, 8)}`,
    collection: asset.grouping?.[0]?.group_value || 'unknown',
    image: imageUrl,
    mint: asset.id,
    rarity: calculateRarity(attributes),
    traits: attributes.length,
    attributes: attributes,
    description: metadata?.description || '',
    symbol: metadata?.symbol || '',
    owner: asset.ownership?.owner || null,
    creators: asset.creators || [],
    royalty: asset.royalty || {},
    burnt: asset.burnt || false,
    compressed: asset.compression?.compressed || false,
    external_url: metadata?.external_url || '',
    animation_url: metadata?.animation_url || '',
    rawMetadata: metadata,
    rawContent: asset.content,
  };
};

// Calculate rarity based on attributes
const calculateRarity = (attributes: any[]) => {
  const traitCount = attributes.length;
  
  if (traitCount >= 8) return 'Legendary';
  if (traitCount >= 6) return 'Epic';
  if (traitCount >= 4) return 'Rare';
  return 'Common';
};

// Get NFTs by collection address
const getNFTsByCollection = async (collectionAddress: string, limit = 50, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'search-assets',
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: collectionAddress,
          page: 1,
          limit: limit,
        },
      }),
    });

    const data = await response.json();
    
    if (data.result && data.result.items) {
      const formattedNFTs = data.result.items
        .filter((item: any) => item.interface === 'V1_NFT')
        .map(formatHeliusNFT)
        .filter((nft: any) => nft.image && nft.image !== '' && !nft.image.includes('placeholder'));
      
      return formattedNFTs;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching NFTs by collection:', error);
    return [];
  }
};

// Get wallet balance using Helius
export const getWalletBalance = async (walletAddress: string, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
};

// Search for specific NFT by mint address
export const searchNFTByMint = async (mintAddress: string, userWallet?: string) => {
  try {
    const rpcUrl = await getHeliusRpcUrl(userWallet);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: {
          id: mintAddress,
        },
      }),
    });

    const data = await response.json();
    
    if (data.result) {
      const formattedNFT = formatHeliusNFT(data.result);
      return formattedNFT;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching NFT by mint:', error);
    return null;
  }
};

// Get current network info for display with correct explorer URL format
export const getCurrentNetworkInfo = async (userWallet?: string) => {
  const config = await getHeliusConfig(userWallet);
  const network = await getCurrentNetwork(userWallet);
  
  return {
    network,
    rpcUrl: await getHeliusRpcUrl(userWallet),
    apiKey: config.apiKey,
    explorerUrl: network === 'devnet' 
      ? 'https://explorer.solana.com'
      : 'https://explorer.solana.com',
  };
};

// Validate if an address is a valid NFT collection
const validateCollection = async (address: string, userWallet?: string) => {
  try {
    const collectionInfo = await getCollectionInfo(address, userWallet);
    return collectionInfo && collectionInfo.total > 0;
  } catch (error) {
    console.error('Error validating collection:', error);
    return false;
  }
};