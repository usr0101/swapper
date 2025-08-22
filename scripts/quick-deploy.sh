#!/bin/bash

# Quick Deploy Script - For when you just need to redeploy quickly
# This script assumes everything is already set up correctly

set -e

echo "⚡ Quick Anchor Deploy"
echo "====================="

# Check if we have a previous program ID
if [ -f ".program_id" ]; then
    EXISTING_ID=$(cat .program_id)
    echo "Found existing Program ID: $EXISTING_ID"
    echo ""
    echo "Choose deployment option:"
    echo "1) Upgrade existing program (recommended)"
    echo "2) Deploy new program"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        echo "🔄 Upgrading existing program..."
        anchor build
        anchor upgrade "$EXISTING_ID" --provider.cluster devnet
        echo "✅ Program upgraded successfully!"
        exit 0
    fi
fi

echo "🚀 Deploying new program..."

# Quick build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Extract and save program ID
PROGRAM_ID=$(anchor deploy --provider.cluster devnet 2>&1 | grep "Program Id:" | awk '{print $3}' | tail -1)

if [ -n "$PROGRAM_ID" ]; then
    echo "$PROGRAM_ID" > .program_id
    echo "✅ New Program ID saved: $PROGRAM_ID"
    
    # Quick update of configurations
    sed -i.backup "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/g" programs/nft-swap/src/lib.rs
    sed -i.backup "s/new PublicKey('.*')/new PublicKey('$PROGRAM_ID')/g" src/lib/anchor.ts
    
    echo "✅ Configurations updated!"
else
    echo "❌ Failed to extract Program ID"
    exit 1
fi