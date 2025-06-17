#!/bin/bash

# NFT Swap Platform Deployment Script
# This script automates the deployment process

set -e

echo "🚀 Starting NFT Swap Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install Node.js first."
        exit 1
    fi
    
    print_success "All dependencies found!"
}

# Setup Solana configuration
setup_solana() {
    print_status "Setting up Solana configuration..."
    
    # Set to devnet
    solana config set --url devnet
    
    # Check if wallet exists
    if [ ! -f ~/.config/solana/id.json ]; then
        print_warning "No wallet found. Creating new wallet..."
        solana-keygen new --outfile ~/.config/solana/id.json
        print_warning "IMPORTANT: Save your seed phrase securely!"
    fi
    
    # Get wallet address
    WALLET_ADDRESS=$(solana address)
    print_status "Using wallet: $WALLET_ADDRESS"
    
    # Check balance
    BALANCE=$(solana balance | cut -d' ' -f1)
    print_status "Current balance: $BALANCE SOL"
    
    # Request airdrop if balance is low
    if (( $(echo "$BALANCE < 2" | bc -l) )); then
        print_status "Requesting SOL airdrop..."
        solana airdrop 2
        sleep 5
    fi
    
    print_success "Solana setup complete!"
}

# Deploy smart contract
deploy_contract() {
    print_status "Building and deploying smart contract..."
    
    # Build the program
    anchor build
    
    # Deploy to devnet
    DEPLOY_OUTPUT=$(anchor deploy 2>&1)
    
    # Extract program ID
    PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')
    
    if [ -z "$PROGRAM_ID" ]; then
        print_error "Failed to extract Program ID from deployment output"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_success "Smart contract deployed!"
    print_status "Program ID: $PROGRAM_ID"
    
    # Save program ID to file
    echo "$PROGRAM_ID" > .program_id
    echo "$WALLET_ADDRESS" > .admin_wallet
}

# Update frontend configuration
update_frontend() {
    print_status "Updating frontend configuration..."
    
    PROGRAM_ID=$(cat .program_id)
    ADMIN_WALLET=$(cat .admin_wallet)
    
    # Update anchor.ts
    sed -i.bak "s/SwapProgram111111111111111111111111111111111/$PROGRAM_ID/g" src/lib/anchor.ts
    
    # Update WalletContext.tsx
    sed -i.bak "s/J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M/$ADMIN_WALLET/g" src/contexts/WalletContext.tsx
    
    # Create .env file
    cat > .env << EOF
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=$PROGRAM_ID
VITE_ADMIN_WALLET=$ADMIN_WALLET
EOF
    
    print_success "Frontend configuration updated!"
}

# Build frontend
build_frontend() {
    print_status "Installing dependencies and building frontend..."
    
    npm install
    npm run build
    
    print_success "Frontend built successfully!"
}

# Deploy to Vercel (optional)
deploy_vercel() {
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod --yes
        print_success "Deployed to Vercel!"
    else
        print_warning "Vercel CLI not found. Skipping Vercel deployment."
        print_status "You can manually deploy the 'dist' folder to any hosting service."
    fi
}

# Test deployment
test_deployment() {
    print_status "Running tests..."
    
    if anchor test; then
        print_success "All tests passed!"
    else
        print_warning "Some tests failed. Please check the output above."
    fi
}

# Main deployment flow
main() {
    echo "🎯 NFT Swap Platform - Automated Deployment"
    echo "=========================================="
    
    check_dependencies
    setup_solana
    deploy_contract
    update_frontend
    build_frontend
    test_deployment
    deploy_vercel
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo ""
    print_success "Your NFT Swap Platform is now deployed!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "  • Network: Devnet"
    echo "  • Program ID: $(cat .program_id)"
    echo "  • Admin Wallet: $(cat .admin_wallet)"
    echo "  • Frontend: Built and ready for hosting"
    echo ""
    echo "🔗 Next Steps:"
    echo "  1. Test your platform thoroughly"
    echo "  2. Create your first NFT pool"
    echo "  3. Deploy to mainnet when ready"
    echo ""
    echo "📚 Resources:"
    echo "  • Solana Explorer: https://explorer.solana.com/?cluster=devnet"
    echo "  • Your Program: https://explorer.solana.com/address/$(cat .program_id)?cluster=devnet"
    echo ""
}

# Run main function
main "$@"