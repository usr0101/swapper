# 📥 Download and Deploy Instructions

## Download the Project

### Method 1: Download as ZIP
1. Use your browser's developer tools
2. Go to Sources tab
3. Find the project files
4. Copy the entire project structure

### Method 2: Git Clone (if available)
```bash
# If you have git access to this project
git clone <your-repo-url>
cd solana-nft-swap-platform
```

## Local Setup

### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli
```

### 2. Setup Solana Wallet
```bash
# Create or import wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Set to devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2
```

### 3. Deploy Solana Program
```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Copy the Program ID from output
```

### 4. Update Frontend
```bash
# Update the program ID in src/lib/anchor.ts
# Or use the Admin Dashboard deployment feature

# Build frontend
npm run build

# Deploy frontend to Vercel/Netlify
vercel --prod
# or
netlify deploy --prod --dir=dist
```

## Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing

1. Connect admin wallet: `J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M`
2. Create test pools
3. Test atomic swaps
4. Verify transactions on Solana Explorer

## Production Deployment

For mainnet:
1. Update `Anchor.toml` cluster to `mainnet-beta`
2. Deploy with real SOL
3. Update frontend network settings
4. Test thoroughly before going live