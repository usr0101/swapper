#!/bin/bash

# Deploy SwapperCollection to Solana Devnet
echo "🚀 Deploying SwapperCollection to Solana Devnet"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "⚠️  Solana CLI not found. Installing..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# Set to devnet
echo "🌐 Setting Solana to devnet..."
solana config set --url devnet

# Check if wallet exists
if [ ! -f ~/.config/solana/id.json ]; then
    echo "🔑 Creating new Solana wallet..."
    solana-keygen new --outfile ~/.config/solana/id.json
    echo "⚠️  IMPORTANT: Save your seed phrase securely!"
fi

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo "👤 Using wallet: $WALLET_ADDRESS"

# Check balance
BALANCE=$(solana balance | cut -d' ' -f1)
echo "💰 Current balance: $BALANCE SOL"

# Request airdrop if balance is low
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "🪂 Requesting SOL airdrop..."
    solana airdrop 2
    sleep 5
    
    # Check balance again
    BALANCE=$(solana balance | cut -d' ' -f1)
    echo "💰 New balance: $BALANCE SOL"
fi

# Create the collection
echo "🎨 Creating SwapperCollection..."
npm run create-collection

# Check if collection was created successfully
if [ -f "swapper-collection.json" ]; then
    echo ""
    echo "🎉 SwapperCollection Created Successfully!"
    echo "========================================"
    
    # Extract collection info
    COLLECTION_MINT=$(node -p "JSON.parse(require('fs').readFileSync('swapper-collection.json', 'utf8')).collectionMint")
    CREATOR=$(node -p "JSON.parse(require('fs').readFileSync('swapper-collection.json', 'utf8')).creator")
    TOTAL_NFTS=$(node -p "JSON.parse(require('fs').readFileSync('swapper-collection.json', 'utf8')).totalSupply")
    
    echo "📦 Collection Mint: $COLLECTION_MINT"
    echo "👤 Creator: $CREATOR"
    echo "🔢 Total NFTs: $TOTAL_NFTS"
    echo "🌐 Network: Solana Devnet"
    echo "🔗 Explorer: https://explorer.solana.com/address/$COLLECTION_MINT?cluster=devnet"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update your frontend to use this collection"
    echo "2. Test the swap functionality"
    echo "3. Share the collection with others for testing"
    echo ""
    echo "💾 Collection data saved to: swapper-collection.json"
    echo "🔑 Wallet data saved to: .swapper-wallet.json"
    echo ""
    echo "⚠️  IMPORTANT: Keep your wallet file secure!"
    
else
    echo "❌ Collection creation failed. Check the logs above for errors."
    exit 1
fi