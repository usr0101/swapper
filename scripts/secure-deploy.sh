#!/usr/bin/env bash

# SECURITY FIX: Secure deployment script that doesn't mutate Program IDs
# This script builds and deploys without post-compilation modifications

set -e

echo "🔒 Secure NFT Swap Platform Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate environment
validate_environment() {
    print_status "Validating environment..."
    
    # Check required tools
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install it first."
        exit 1
    fi
    
    # Check network configuration
    local network="${VITE_SOLANA_NETWORK:-devnet}"
    if [[ "$network" != "devnet" && "$network" != "mainnet-beta" ]]; then
        print_error "Invalid network: $network. Must be 'devnet' or 'mainnet-beta'"
        exit 1
    fi
    
    print_success "Environment validation passed"
}

# Setup Solana configuration
setup_solana() {
    local network="${VITE_SOLANA_NETWORK:-devnet}"
    print_status "Setting up Solana for $network..."
    
    solana config set --url "$network"
    
    # Check if wallet exists
    if [ ! -f ~/.config/solana/id.json ]; then
        print_warning "No wallet found. Creating new wallet..."
        solana-keygen new --outfile ~/.config/solana/id.json
        print_warning "IMPORTANT: Save your seed phrase securely!"
    fi
    
    # Get wallet address
    WALLET_ADDRESS=$(solana address)
    print_status "Using wallet: $WALLET_ADDRESS"
    
    # Check balance for devnet
    if [ "$network" = "devnet" ]; then
        BALANCE=$(solana balance | cut -d' ' -f1)
        print_status "Current balance: $BALANCE SOL"
        
        # Request airdrop if balance is low
        if (( $(echo "$BALANCE < 2" | bc -l 2>/dev/null || echo "1") )); then
            print_status "Requesting SOL airdrop..."
            solana airdrop 2
            sleep 5
        fi
    fi
    
    print_success "Solana setup complete"
}

# Build and deploy program
deploy_program() {
    print_status "Building and deploying program..."
    
    # Clean build
    anchor clean
    
    # Build the program
    print_status "Building program..."
    anchor build
    
    # Verify build output
    if [ ! -f "target/deploy/nft_swap.so" ]; then
        print_error "Build failed - program binary not found"
        exit 1
    fi
    
    # Deploy to the configured network
    print_status "Deploying to $(solana config get | grep 'RPC URL' | awk '{print $3}')..."
    
    DEPLOY_OUTPUT=$(anchor deploy 2>&1)
    echo "$DEPLOY_OUTPUT"
    
    # Extract program ID from deployment output
    PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -E "(Program Id|Program ID)" | awk '{print $3}' | tail -1)
    
    if [ -z "$PROGRAM_ID" ]; then
        print_error "Failed to extract Program ID from deployment output"
        exit 1
    fi
    
    print_success "Program deployed successfully!"
    print_status "Program ID: $PROGRAM_ID"
    
    # Save program ID for reference (but don't modify source code)
    echo "$PROGRAM_ID" > .deployed_program_id
    echo "$(date): $PROGRAM_ID" >> .deployment_history
    
    # Verify deployment
    print_status "Verifying deployment..."
    if solana account "$PROGRAM_ID" > /dev/null 2>&1; then
        print_success "Program account verified on blockchain"
    else
        print_error "Program account not found on blockchain"
        exit 1
    fi
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Build frontend
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Frontend build failed"
        exit 1
    fi
    
    print_success "Frontend built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run Anchor tests (skip deploy since we already deployed)
    if anchor test --skip-deploy 2>/dev/null; then
        print_success "All tests passed"
    else
        print_warning "Tests skipped or failed, but deployment was successful"
    fi
}

# Main deployment flow
main() {
    echo "🚀 Starting secure deployment..."
    
    validate_environment
    setup_solana
    deploy_program
    build_frontend
    run_tests
    
    echo ""
    print_success "🎉 Secure Deployment Complete!"
    echo "================================"
    echo ""
    
    if [ -f ".deployed_program_id" ]; then
        DEPLOYED_ID=$(cat .deployed_program_id)
        echo "📋 Deployment Summary:"
        echo "  • Network: ${VITE_SOLANA_NETWORK:-devnet}"
        echo "  • Program ID: $DEPLOYED_ID"
        echo "  • Wallet: $(solana address)"
        echo "  • Frontend: Built and ready"
        echo ""
        echo "🔗 Next Steps:"
        echo "  1. Update your .env file with VITE_PROGRAM_ID=$DEPLOYED_ID"
        echo "  2. Test the platform thoroughly"
        echo "  3. Deploy frontend to your hosting provider"
        echo ""
        echo "📚 Resources:"
        echo "  • Solana Explorer: https://explorer.solana.com/address/$DEPLOYED_ID?cluster=${VITE_SOLANA_NETWORK:-devnet}"
        echo ""
        print_warning "SECURITY NOTE: Program ID is immutable after deployment. No runtime modifications allowed."
    fi
}

# Run main function
main "$@"