# 🔗 Free Devnet APIs Setup Guide

## 📋 **Available Free APIs**

### **1. Helius API** ⭐ (Recommended)
- **Free Tier**: 100,000 requests/month
- **Features**: NFT metadata, wallet assets, transactions
- **Setup**: 
  1. Go to [helius.xyz](https://helius.xyz)
  2. Create free account
  3. Get API key
  4. Use: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`

### **2. QuickNode** 
- **Free Tier**: 500,000 requests/month
- **Features**: Full RPC access, NFT APIs
- **Setup**:
  1. Go to [quicknode.com](https://quicknode.com)
  2. Create Solana devnet endpoint
  3. Use provided RPC URL

### **3. Alchemy**
- **Free Tier**: 300M compute units/month
- **Features**: Enhanced APIs, NFT metadata
- **Setup**:
  1. Go to [alchemy.com](https://alchemy.com)
  2. Create Solana app
  3. Use: `https://solana-devnet.g.alchemy.com/v2/YOUR_KEY`

### **4. Shyft API**
- **Free Tier**: 100,000 requests/month
- **Features**: NFT APIs, collection data
- **Setup**:
  1. Go to [shyft.to](https://shyft.to)
  2. Get API key
  3. Use: `https://api.shyft.to/sol/v1`

### **5. Solscan API**
- **Free Tier**: 5,000 requests/day
- **Features**: Transaction data, NFT metadata
- **No API key required**
- **Use**: `https://public-api.solscan.io`

### **6. Magic Eden API**
- **Free Tier**: No limits (public endpoints)
- **Features**: Collection stats, floor prices
- **No API key required**
- **Use**: `https://api-devnet.magiceden.dev/v2`

## 🚀 **Quick Setup**

### **Step 1: Get API Keys**
```bash
# 1. Helius (Recommended)
# Visit: https://helius.xyz
# Get your API key

# 2. Shyft (Good for NFT data)
# Visit: https://shyft.to
# Get your API key

# 3. QuickNode (Reliable RPC)
# Visit: https://quicknode.com
# Create Solana devnet endpoint
```

### **Step 2: Update Environment Variables**
```env
# Add to your .env file
VITE_HELIUS_API_KEY=your_helius_key_here
VITE_SHYFT_API_KEY=your_shyft_key_here
VITE_QUICKNODE_RPC=your_quicknode_url_here
VITE_ALCHEMY_API_KEY=your_alchemy_key_here
```

### **Step 3: Update Your Code**
```typescript
// Replace mock data with real API calls
import { getHeliusNFTs, getShyftCollectionData } from './lib/devnet-apis';

// Get real NFTs for a wallet
const userNFTs = await getHeliusNFTs(walletAddress);

// Get real collection data
const collectionData = await getShyftCollectionData(collectionAddress);
```

## 📊 **Real Devnet Collections**

### **Collections with Active Devnet Presence**
1. **Solana Monkey Business (SMB)**
   - Symbol: `SMB`
   - Has devnet versions for testing

2. **Degenerate Ape Academy**
   - Symbol: `DAPE`
   - Active on devnet

3. **Aurory**
   - Symbol: `AURY`
   - Gaming NFTs on devnet

## 🔧 **Implementation Examples**

### **Get Real NFT Data**
```typescript
// Using Helius API
const nfts = await fetch(`https://devnet.helius-rpc.com/?api-key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 'my-id',
    method: 'getAssetsByOwner',
    params: { ownerAddress: walletAddress },
  }),
});
```

### **Get Collection Stats**
```typescript
// Using Magic Eden API (free)
const stats = await fetch(
  `https://api-devnet.magiceden.dev/v2/collections/${symbol}/stats`
);
```

### **Get Floor Prices**
```typescript
// Multiple sources for accuracy
const floorPrice = await getFloorPrice(collectionSymbol);
```

## 💡 **Best Practices**

### **1. API Rate Limiting**
- Implement caching for frequently requested data
- Use multiple APIs as fallbacks
- Cache collection metadata locally

### **2. Error Handling**
- Always have fallback data
- Graceful degradation when APIs fail
- User-friendly error messages

### **3. Performance**
- Batch API requests when possible
- Use pagination for large datasets
- Implement loading states

## 🎯 **Recommended Setup for Your Project**

1. **Primary**: Helius API (comprehensive NFT data)
2. **Secondary**: Magic Eden API (collection stats)
3. **Fallback**: Solscan API (basic metadata)
4. **RPC**: QuickNode or Alchemy (reliable connection)

This setup gives you:
- ✅ Real NFT metadata
- ✅ Accurate floor prices
- ✅ Collection statistics
- ✅ Reliable devnet connection
- ✅ Free tier limits that scale

## 🔗 **Useful Links**

- [Helius Documentation](https://docs.helius.xyz/)
- [Shyft API Docs](https://docs.shyft.to/)
- [Magic Eden API](https://api.magiceden.dev/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solscan API](https://public-api.solscan.io/docs/)