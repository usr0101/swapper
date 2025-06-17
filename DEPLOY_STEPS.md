# 🚀 Step-by-Step Deployment Guide

## 📋 **Prerequisites**

Before we start, make sure you have:
- [ ] Node.js 18+ installed
- [ ] Solana CLI installed
- [ ] Anchor CLI installed
- [ ] A Solana wallet (Phantom recommended)
- [ ] Some devnet SOL (free from faucet)

## 🔧 **Step 1: Install Required Tools**

### Install Solana CLI
```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Windows (PowerShell)
cmd /c "curl https://release.solana.com/v1.17.0/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs && C:\solana-install-tmp\solana-install-init.exe v1.17.0"
```

### Install Anchor CLI
```bash
# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Verify installation
anchor --version
```

### Verify Solana Installation
```bash
solana --version
solana config get
```

## 🔑 **Step 2: Setup Solana Wallet**

### Create/Import Wallet
```bash
# Create new wallet (save the seed phrase!)
solana-keygen new --outfile ~/.config/solana/id.json

# Or import existing wallet
solana-keygen recover 'prompt:?key=0/0' --outfile ~/.config/solana/id.json

# Set as default wallet
solana config set --keypair ~/.config/solana/id.json
```

### Get Your Wallet Address
```bash
solana address
# Copy this address - you'll need it for admin setup
```

### Switch to Devnet
```bash
solana config set --url devnet
```

### Get Devnet SOL (Free)
```bash
# Request 2 SOL for deployment
solana airdrop 2

# Check balance
solana balance
```

## 🏗️ **Step 3: Deploy Smart Contract**

### Build the Program
```bash
# In your project root
anchor build
```

### Deploy to Devnet
```bash
anchor deploy
```

**Important**: Copy the **Program ID** from the deployment output. You'll need it for the frontend!

Example output:
```
Program Id: SwapProgram111111111111111111111111111111111
```

## ⚙️ **Step 4: Update Frontend Configuration**

### Update Program ID
Open `src/lib/anchor.ts` and update the Program ID:

```typescript
// Replace with your deployed program ID
export const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID_HERE');
```

### Update Admin Wallet
Open `src/contexts/WalletContext.tsx` and update the admin address:

```typescript
// Replace with your wallet address from Step 2
const ADMIN_ADDRESS = 'YOUR_WALLET_ADDRESS_HERE';
```

### Set Network Configuration
Create `.env` file in project root:

```env
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID_HERE
VITE_ADMIN_WALLET=YOUR_WALLET_ADDRESS_HERE
```

## 🌐 **Step 5: Deploy Frontend**

### Option A: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Build the project
npm run build

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: your-nft-swap-platform
# - Directory: ./
# - Override settings? No
```

### Option B: Deploy to Netlify

```bash
# Build the project
npm run build

# Go to netlify.com
# Drag and drop the 'dist' folder
# Or connect your GitHub repo for auto-deployment
```

## 🧪 **Step 6: Test Your Deployment**

### Test Smart Contract
```bash
# Run tests
anchor test
```

### Test Frontend
1. Open your deployed website
2. Connect your wallet (make sure it's on devnet)
3. You should see admin controls if using the admin wallet
4. Try creating a pool
5. Test the swap interface

## 🔄 **Step 7: Create Your First Pool**

1. **Connect Admin Wallet**: Use the wallet address you set as admin
2. **Go to Admin Dashboard**: Click the "Admin" tab
3. **Create Pool**: 
   - Collection ID: `test-collection`
   - Name: `Test NFT Collection`
   - Description: `Test collection for swapping`
   - Image URL: Use any image URL
4. **Copy Pool Address**: Users will send NFTs to this address

## 📊 **Step 8: Monitor Your Deployment**

### Check Deployment Status
```bash
# Check program account
solana account YOUR_PROGRAM_ID

# Check your wallet balance
solana balance
```

### Monitor Transactions
- Visit [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- Search for your program ID or wallet address
- Monitor all transactions

## 🚀 **Step 9: Go to Mainnet (Production)**

When ready for production:

### Update Configuration
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Get mainnet SOL (buy from exchange)
# You'll need ~2-5 SOL for deployment
```

### Update Anchor.toml
```toml
[provider]
cluster = "mainnet-beta"
```

### Deploy to Mainnet
```bash
# Build and deploy
anchor build
anchor deploy

# Update frontend with new program ID
# Redeploy frontend with mainnet config
```

## 🎯 **Quick Commands Summary**

```bash
# Complete devnet deployment
solana config set --url devnet
solana airdrop 2
anchor build
anchor deploy
npm run build
vercel
```

## 🆘 **Troubleshooting**

### Common Issues

**"Insufficient funds for deployment"**
```bash
solana airdrop 2
# Wait a few seconds, then try again
```

**"Program already deployed"**
```bash
# Use upgrade instead
anchor upgrade YOUR_PROGRAM_ID
```

**"Wallet not found"**
```bash
# Make sure wallet file exists
ls ~/.config/solana/id.json
```

**"RPC connection failed"**
```bash
# Try different RPC endpoint
solana config set --url https://api.devnet.solana.com
```

## ✅ **Deployment Checklist**

- [ ] Solana CLI installed and configured
- [ ] Anchor CLI installed
- [ ] Wallet created and funded with devnet SOL
- [ ] Smart contract built and deployed
- [ ] Program ID updated in frontend
- [ ] Admin wallet address configured
- [ ] Frontend built and deployed
- [ ] Test pool created successfully
- [ ] Swap functionality tested
- [ ] Ready for mainnet deployment

## 🎉 **Success!**

Your NFT swap platform is now live! You have:

✅ **Smart contracts** deployed on Solana
✅ **Frontend** hosted and accessible
✅ **Admin controls** for pool management
✅ **Real wallet integration** with Phantom/Solflare
✅ **Automatic floor pricing** system
✅ **Pool addresses** for NFT deposits

**Next Steps:**
1. Test thoroughly on devnet
2. Get community feedback
3. Deploy to mainnet when ready
4. Market your platform to NFT communities

---

**Need help?** Check the troubleshooting section or refer to:
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)