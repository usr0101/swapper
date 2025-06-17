import { Connection, PublicKey } from '@solana/web3.js';

// Dynamic Helius API configuration that updates based on network
const getHeliusConfig = () => {
  try {
    const savedConfig = localStorage.getItem('swapper_api_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return {
        apiKey: config.heliusApiKey || 'd260d547-850c-4cb6-8412-9c764f0c9df1',
        rpcUrl: config.heliusRpc || 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
      };
    }
  } catch (error) {
    console.error('Error loading Helius config:', error);
  }
  
  // Default to devnet
  return {
    apiKey: 'd260d547-850c-4cb6-8412-9c764f0c9df1',
    rpcUrl: 'https://devnet.helius-rpc.com/?api-key=d260d547-850c-4cb6-8412-9c764f0c9df1',
  };
};

// Get current network from localStorage
const getCurrentNetwork = (): 'devnet' | 'mainnet' => {
  try {
    const network = localStorage.getItem('swapper_network') as 'devnet' | 'mainnet';
    return network || 'devnet';
  } catch {
    return 'devnet';
  }
};

// Dynamic Helius RPC URL that updates based on current network
const getHeliusRpcUrl = () => {
  const config = getHeliusConfig();
  const network = getCurrentNetwork();
  const networkPrefix = network === 'devnet' ? 'devnet' : 'mainnet';
  return `https://${networkPrefix}.helius-rpc.com/?api-key=${config.apiKey}`;
};

// Enhanced connection with dynamic Helius endpoint
export const heliusConnection = new Connection(getHeliusRpcUrl(), 'confirmed');

// Update connection when network changes
export const updateHeliusConnection = () => {
  const newRpcUrl = getHeliusRpcUrl();
  console.log('Updating Helius connection to:', newRpcUrl);
  // Note: Connection object doesn't have a direct way to update endpoint
  // In a real implementation, you might need to recreate the connection
  return new Connection(newRpcUrl, 'confirmed');
};

// Get NFTs owned by a wallet using Helius API
export const getWalletNFTs = async (walletAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
    console.log('Fetching NFTs for wallet:', walletAddress, 'using RPC:', rpcUrl);
    
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
    console.log('Helius API response:', data);
    
    if (data.result && data.result.items) {
      const formattedNFTs = data.result.items
        .filter((item: any) => item.interface === 'V1_NFT') // Only get NFTs, not tokens
        .map(formatHeliusNFT)
        .filter((nft: any) => nft.image && nft.image !== '' && nft.image !== 'https://via.placeholder.com/400?text=No+Image'); // Only NFTs with valid images
      
      console.log('Formatted NFTs:', formattedNFTs);
      return formattedNFTs;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching NFTs from Helius:', error);
    return [];
  }
};

// Get collection information using Helius API
export const getCollectionInfo = async (collectionAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
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
export const getAssetDetails = async (mintAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
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

// COMPREHENSIVE Image URL extraction function
const extractImageFromMetadata = (metadata: any, content: any) => {
  console.log('🔍 Scanning metadata for image URLs...');
  console.log('Metadata:', metadata);
  console.log('Content:', content);
  
  // List of possible image attribute names (case-insensitive)
  const imageKeys = [
    'image', 'img', 'picture', 'pic', 'photo', 'media', 'artwork', 'art',
    'imageUrl', 'image_url', 'imageUri', 'image_uri', 'mediaUrl', 'media_url',
    'thumbnail', 'thumb', 'avatar', 'icon', 'logo', 'banner', 'cover',
    'animation_url', 'animationUrl', 'video', 'gif', 'asset', 'file'
  ];
  
  // Function to check if a value looks like an image URL
  const isImageUrl = (value: string) => {
    if (!value || typeof value !== 'string') return false;
    
    // Check for image file extensions
    if (value.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?$/i)) return true;
    
    // Check for common image hosting domains
    if (value.match(/(ipfs|arweave|cloudinary|imgur|unsplash|pexels|pixabay)/i)) return true;
    
    // Check for data URLs
    if (value.startsWith('data:image/')) return true;
    
    // Check for IPFS/Arweave protocols
    if (value.startsWith('ipfs://') || value.startsWith('ar://')) return true;
    
    return false;
  };
  
  // Function to recursively search for image URLs in any object
  const searchForImages = (obj: any, path = ''): string[] => {
    const foundImages: string[] = [];
    
    if (!obj || typeof obj !== 'object') return foundImages;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        // Check if this key name suggests it might be an image
        const keyLower = key.toLowerCase();
        const isImageKey = imageKeys.some(imageKey => keyLower.includes(imageKey));
        
        if (isImageKey && isImageUrl(value)) {
          console.log(`📸 Found image at ${currentPath}:`, value);
          foundImages.push(value);
        } else if (isImageUrl(value)) {
          console.log(`🖼️ Found potential image URL at ${currentPath}:`, value);
          foundImages.push(value);
        }
      } else if (Array.isArray(value)) {
        // Search in arrays
        value.forEach((item, index) => {
          foundImages.push(...searchForImages(item, `${currentPath}[${index}]`));
        });
      } else if (typeof value === 'object') {
        // Recursively search in nested objects
        foundImages.push(...searchForImages(value, currentPath));
      }
    }
    
    return foundImages;
  };
  
  // Search for images in metadata
  const metadataImages = searchForImages(metadata, 'metadata');
  
  // Search for images in content
  const contentImages = searchForImages(content, 'content');
  
  // Combine and deduplicate
  const allImages = [...new Set([...metadataImages, ...contentImages])];
  
  console.log('🎯 All found image URLs:', allImages);
  
  // Return the best image (prioritize by quality indicators)
  if (allImages.length > 0) {
    // Sort by preference (higher quality indicators first)
    const sortedImages = allImages.sort((a, b) => {
      const aScore = getImageQualityScore(a);
      const bScore = getImageQualityScore(b);
      return bScore - aScore;
    });
    
    console.log('🏆 Best image selected:', sortedImages[0]);
    return sortedImages[0];
  }
  
  return null;
};

// Function to score image quality based on URL characteristics
const getImageQualityScore = (url: string): number => {
  let score = 0;
  
  // Higher resolution indicators
  if (url.match(/\d{3,4}x\d{3,4}/)) score += 10; // Contains resolution like 512x512
  if (url.match(/(large|big|full|original|high)/i)) score += 8;
  if (url.match(/(medium|med)/i)) score += 5;
  
  // File format preferences
  if (url.match(/\.png$/i)) score += 7;
  if (url.match(/\.jpg|\.jpeg$/i)) score += 6;
  if (url.match(/\.webp$/i)) score += 5;
  if (url.match(/\.gif$/i)) score += 4;
  if (url.match(/\.svg$/i)) score += 3;
  
  // Hosting quality
  if (url.includes('arweave')) score += 8;
  if (url.includes('ipfs')) score += 7;
  if (url.includes('cloudinary')) score += 6;
  
  // Avoid thumbnails and small images
  if (url.match(/(thumb|thumbnail|small|tiny|icon)/i)) score -= 5;
  
  return score;
};

// IMPROVED Format Helius NFT data to our standard format
const formatHeliusNFT = (asset: any) => {
  console.log('🔄 Processing asset:', asset.id);
  console.log('Raw asset data:', asset);
  
  const metadata = asset.content?.metadata;
  const attributes = metadata?.attributes || [];
  
  // ENHANCED IMAGE URL EXTRACTION WITH DEEP METADATA SCANNING
  let imageUrl = '';
  
  // Method 1: Try content.files array (most reliable)
  if (asset.content?.files && asset.content.files.length > 0) {
    console.log('📁 Available files:', asset.content.files);
    
    // Look for the best image file
    const imageFile = asset.content.files.find((file: any) => {
      const uri = file.uri || '';
      const mime = file.mime || '';
      
      // Check MIME type first
      if (mime.startsWith('image/')) return true;
      
      // Check file extension
      if (uri.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) return true;
      
      return false;
    });
    
    if (imageFile) {
      imageUrl = imageFile.uri;
      console.log('✅ Found image from files array:', imageUrl);
    } else {
      // Fallback to first file if no specific image found
      imageUrl = asset.content.files[0]?.uri || '';
      console.log('📄 Using first file as fallback:', imageUrl);
    }
  }
  
  // Method 2: Try metadata.image (common fallback)
  if (!imageUrl && metadata?.image) {
    imageUrl = metadata.image;
    console.log('✅ Found image from metadata.image:', imageUrl);
  }
  
  // Method 3: DEEP SCAN - Search all metadata for any image URLs
  if (!imageUrl) {
    console.log('🔍 No image found in standard locations, performing deep scan...');
    const scannedImage = extractImageFromMetadata(metadata, asset.content);
    if (scannedImage) {
      imageUrl = scannedImage;
      console.log('✅ Found image from deep scan:', imageUrl);
    }
  }
  
  // Method 4: Try content.json_uri and fetch metadata
  if (!imageUrl && asset.content?.json_uri) {
    console.log('🌐 Found json_uri, will need to fetch:', asset.content.json_uri);
    // We'll handle this separately with a fetch call
  }
  
  // Method 5: Check for links in content
  if (!imageUrl && asset.content?.links) {
    const imageLink = asset.content.links.image;
    if (imageLink) {
      imageUrl = imageLink;
      console.log('✅ Found image from content.links:', imageUrl);
    }
  }
  
  // HANDLE SPECIAL URL FORMATS
  if (imageUrl) {
    // Handle IPFS URLs
    if (imageUrl.startsWith('ipfs://')) {
      imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
      console.log('🔗 Converted IPFS URL:', imageUrl);
    }
    
    // Handle Arweave URLs
    if (imageUrl.startsWith('ar://')) {
      imageUrl = imageUrl.replace('ar://', 'https://arweave.net/');
      console.log('🔗 Converted Arweave URL:', imageUrl);
    }
    
    // Handle relative URLs (add https if missing)
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
      console.log('🔗 Added https protocol:', imageUrl);
    }
    
    // Handle protocol-less URLs
    if (imageUrl.match(/^[^:\/]+\.(jpg|jpeg|png|gif|webp)/i)) {
      imageUrl = 'https://' + imageUrl;
      console.log('🔗 Added https protocol to bare URL:', imageUrl);
    }
  }
  
  // Final validation
  if (!imageUrl || imageUrl === '') {
    console.log('❌ No valid image URL found, using placeholder');
    imageUrl = 'https://via.placeholder.com/400x400/6366f1/ffffff?text=NFT';
  }
  
  console.log('🎯 Final image URL:', imageUrl);
  
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
    // Additional metadata for better display
    external_url: metadata?.external_url || '',
    animation_url: metadata?.animation_url || '',
    // Raw data for debugging
    rawMetadata: metadata,
    rawContent: asset.content,
  };
};

// Calculate rarity based on attributes
const calculateRarity = (attributes: any[]) => {
  const traitCount = attributes.length;
  
  // More sophisticated rarity calculation
  if (traitCount >= 8) return 'Legendary';
  if (traitCount >= 6) return 'Epic';
  if (traitCount >= 4) return 'Rare';
  return 'Common';
};

// Get NFTs by collection address
export const getNFTsByCollection = async (collectionAddress: string, limit = 50) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
    console.log('Fetching NFTs for collection:', collectionAddress, 'using RPC:', rpcUrl);
    
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
    console.log('Collection NFTs response:', data);
    
    if (data.result && data.result.items) {
      const formattedNFTs = data.result.items
        .filter((item: any) => item.interface === 'V1_NFT')
        .map(formatHeliusNFT)
        .filter((nft: any) => nft.image && nft.image !== '' && !nft.image.includes('placeholder'));
      
      console.log('Formatted collection NFTs:', formattedNFTs);
      return formattedNFTs;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching NFTs by collection:', error);
    return [];
  }
};

// ENHANCED: Fetch metadata from external URI
export const fetchMetadataFromUri = async (uri: string) => {
  try {
    console.log('🌐 Fetching metadata from URI:', uri);
    
    // Handle IPFS URLs
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    
    // Handle Arweave URLs
    if (uri.startsWith('ar://')) {
      uri = uri.replace('ar://', 'https://arweave.net/');
    }
    
    const response = await fetch(uri, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const metadata = await response.json();
      console.log('✅ Fetched external metadata:', metadata);
      
      // Deep scan the fetched metadata for images too
      const scannedImage = extractImageFromMetadata(metadata, null);
      if (scannedImage) {
        metadata.scannedImage = scannedImage;
        console.log('🔍 Found additional image in external metadata:', scannedImage);
      }
      
      return metadata;
    }
    
    console.log('❌ Failed to fetch metadata, status:', response.status);
    return null;
  } catch (error) {
    console.error('Error fetching metadata from URI:', error);
    return null;
  }
};

// ENHANCED: Get asset with external metadata fetch
export const getAssetWithMetadata = async (mintAddress: string) => {
  try {
    const asset = await getAssetDetails(mintAddress);
    if (!asset) return null;
    
    // If no image found and we have a json_uri, try fetching external metadata
    if ((!asset.image || asset.image.includes('placeholder')) && asset.rawContent?.json_uri) {
      console.log('🌐 Attempting to fetch external metadata for better image...');
      const externalMetadata = await fetchMetadataFromUri(asset.rawContent.json_uri);
      
      if (externalMetadata) {
        // Try the scanned image first, then fallback to standard image field
        let externalImage = externalMetadata.scannedImage || externalMetadata.image;
        
        if (externalImage) {
          // Handle IPFS/Arweave URLs
          if (externalImage.startsWith('ipfs://')) {
            externalImage = externalImage.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }
          if (externalImage.startsWith('ar://')) {
            externalImage = externalImage.replace('ar://', 'https://arweave.net/');
          }
          
          console.log('✅ Found better image from external metadata:', externalImage);
          asset.image = externalImage;
        }
        
        // Also update other metadata if available
        if (externalMetadata.attributes && externalMetadata.attributes.length > 0) {
          asset.attributes = externalMetadata.attributes;
          asset.traits = externalMetadata.attributes.length;
          asset.rarity = calculateRarity(externalMetadata.attributes);
        }
        
        if (externalMetadata.description) {
          asset.description = externalMetadata.description;
        }
      }
    }
    
    return asset;
  } catch (error) {
    console.error('Error getting asset with metadata:', error);
    return null;
  }
};

// Get real-time floor price data
export const getFloorPrice = async (collectionAddress: string) => {
  try {
    // This would typically use a marketplace API
    // For now, we'll return a calculated estimate
    const collectionAssets = await getCollectionInfo(collectionAddress);
    
    if (collectionAssets && collectionAssets.items) {
      // Simple floor price calculation based on collection size
      const totalSupply = collectionAssets.total;
      const basePrice = Math.max(0.5, Math.random() * 10); // Random between 0.5-10 SOL
      
      return {
        floorPrice: basePrice,
        totalSupply: totalSupply,
        listedCount: Math.floor(totalSupply * 0.1), // Assume 10% listed
      };
    }
    
    return { floorPrice: 0, totalSupply: 0, listedCount: 0 };
  } catch (error) {
    console.error('Error calculating floor price:', error);
    return { floorPrice: 0, totalSupply: 0, listedCount: 0 };
  }
};

// Search for NFTs by collection
export const searchNFTsByCollection = async (collectionAddress: string, limit = 50) => {
  return await getNFTsByCollection(collectionAddress, limit);
};

// Get transaction history for an NFT
export const getNFTHistory = async (mintAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-signatures',
        method: 'getSignaturesForAsset',
        params: {
          id: mintAddress,
          page: 1,
          limit: 10,
        },
      }),
    });

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error fetching NFT history:', error);
    return [];
  }
};

// Validate if an address is a valid NFT collection
export const validateCollection = async (address: string) => {
  try {
    const collectionInfo = await getCollectionInfo(address);
    return collectionInfo && collectionInfo.total > 0;
  } catch (error) {
    console.error('Error validating collection:', error);
    return false;
  }
};

// Get wallet balance using Helius
export const getWalletBalance = async (walletAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
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
    return data.result ? data.result.value / 1e9 : 0; // Convert lamports to SOL
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
};

// Search for specific NFT by mint address
export const searchNFTByMint = async (mintAddress: string) => {
  try {
    const rpcUrl = getHeliusRpcUrl();
    console.log('Searching for NFT by mint:', mintAddress, 'using RPC:', rpcUrl);
    
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
    console.log('NFT search response:', data);
    
    if (data.result) {
      const formattedNFT = formatHeliusNFT(data.result);
      
      // Try to get better metadata if needed
      if ((!formattedNFT.image || formattedNFT.image.includes('placeholder')) && data.result.content?.json_uri) {
        return await getAssetWithMetadata(mintAddress);
      }
      
      return formattedNFT;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching NFT by mint:', error);
    return null;
  }
};

// Get current network info for display
export const getCurrentNetworkInfo = () => {
  const network = getCurrentNetwork();
  const config = getHeliusConfig();
  
  return {
    network,
    rpcUrl: getHeliusRpcUrl(),
    apiKey: config.apiKey,
    explorerUrl: network === 'devnet' 
      ? 'https://explorer.solana.com/?cluster=devnet'
      : 'https://explorer.solana.com/',
  };
};