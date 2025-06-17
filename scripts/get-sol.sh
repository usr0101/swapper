#!/bin/bash

# Get SOL for deployment script

echo "🪙 Getting SOL for Deployment"
echo "============================="

# Check current balance
echo "Current balance:"
solana balance

# Request multiple airdrops to ensure we have enough
echo ""
echo "Requesting SOL airdrops..."

for i in {1..3}; do
    echo "Airdrop $i/3..."
    solana airdrop 2
    sleep 2
done

echo ""
echo "Final balance:"
solana balance

echo ""
echo "✅ Ready for deployment!"
echo "Run: anchor deploy --provider.cluster devnet"