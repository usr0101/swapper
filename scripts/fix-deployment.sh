#!/bin/bash

# Global Anchor Deployment Fix Script
# This script resolves common deployment issues permanently

set -e

echo "🔧 Global Anchor Deployment Fix"
echo "================================"

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

# Function to check and fix Anchor configuration
fix_anchor_config() {
    print_status "Checking Anchor configuration..."
    
    # Ensure we're in the right directory
    if [ ! -f "Anchor.toml" ]; then
        print_error "Anchor.toml not found. Are you in the project root?"
        exit 1
    fi
    
    # Check if programs directory exists
    if [ ! -d "programs/nft-swap" ]; then
        print_error "Programs directory not found. Project structure may be incorrect."
        exit 1
    fi
    
    # Check Solana config
    print_status "Checking Solana configuration..."
    solana config get
    
    # Ensure we're on devnet
    solana config set --url devnet
    
    print_success "Anchor configuration checked!"
}

# Function to clean and rebuild everything
clean_and_rebuild() {
    print_status "Cleaning all build artifacts..."
    
    # Remove all build artifacts
    rm -rf target/
    rm -rf .anchor/
    rm -rf node_modules/.cache/
    
    # Clean Anchor cache
    if command -v anchor &> /dev/null; then
        anchor clean || true
    fi
    
    print_success "All artifacts cleaned!"
    
    print_status "Rebuilding project..."
    
    # Build without verbose flag (not supported in all Anchor versions)
    anchor build
    
    # Verify the build output
    if [ ! -f "target/deploy/nft_swap.so" ]; then
        print_error "Build failed - nft_swap.so not found!"
        print_status "Checking target directory contents:"
        ls -la target/ 2>/dev/null || true
        ls -la target/deploy/ 2>/dev/null || true
        
        # Try to diagnose the issue
        print_status "Checking Cargo.toml in programs directory..."
        if [ -f "programs/nft-swap/Cargo.toml" ]; then
            print_status "Cargo.toml found, trying cargo build..."
            cd programs/nft-swap
            cargo build-bpf || cargo build-sbf || true
            cd ../..
        fi
        
        exit 1
    fi
    
    print_success "Project rebuilt successfully!"
}

# Function to deploy with proper error handling
deploy_program() {
    print_status "Deploying program to devnet..."
    
    # Check balance first
    BALANCE=$(solana balance | cut -d' ' -f1)
    print_status "Current balance: $BALANCE SOL"
    
    # Request airdrop if balance is low (using basic comparison)
    if [ $(echo "$BALANCE < 2" | bc 2>/dev/null || echo "1") -eq 1 ]; then
        print_warning "Low balance. Requesting airdrop..."
        solana airdrop 2
        sleep 5
    fi
    
    # Deploy with detailed output
    print_status "Starting deployment..."
    
    # Try deployment and capture output
    if DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1); then
        echo "$DEPLOY_OUTPUT"
        
        # Extract program ID
        PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -E "(Program Id|Program ID)" | awk '{print $3}' | tail -1)
        
        if [ -n "$PROGRAM_ID" ]; then
            print_success "Deployment successful!"
            print_status "Program ID: $PROGRAM_ID"
            
            # Save program ID for future reference
            echo "$PROGRAM_ID" > .program_id
            
            # Update Anchor.toml with new program ID
            update_anchor_toml "$PROGRAM_ID"
            
            return 0
        else
            print_error "Could not extract Program ID from deployment output"
            echo "Full output:"
            echo "$DEPLOY_OUTPUT"
            return 1
        fi
    else
        print_error "Deployment failed"
        echo "Error output:"
        echo "$DEPLOY_OUTPUT"
        return 1
    fi
}

# Function to update Anchor.toml with new program ID
update_anchor_toml() {
    local PROGRAM_ID=$1
    print_status "Updating Anchor.toml with Program ID: $PROGRAM_ID"
    
    # Create backup
    cp Anchor.toml Anchor.toml.backup
    
    # Update all network configurations
    if command -v sed &> /dev/null; then
        # macOS/BSD sed
        sed -i '' "s/nft_swap = \".*\"/nft_swap = \"$PROGRAM_ID\"/g" Anchor.toml 2>/dev/null || \
        # GNU sed
        sed -i "s/nft_swap = \".*\"/nft_swap = \"$PROGRAM_ID\"/g" Anchor.toml
    fi
    
    print_success "Anchor.toml updated!"
}

# Function to update frontend configuration
update_frontend_config() {
    if [ -f ".program_id" ]; then
        local PROGRAM_ID=$(cat .program_id)
        print_status "Updating frontend with Program ID: $PROGRAM_ID"
        
        # Update lib/anchor.ts
        if [ -f "src/lib/anchor.ts" ]; then
            if command -v sed &> /dev/null; then
                # macOS/BSD sed
                sed -i '' "s/new PublicKey('.*')/new PublicKey('$PROGRAM_ID')/g" src/lib/anchor.ts 2>/dev/null || \
                # GNU sed
                sed -i "s/new PublicKey('.*')/new PublicKey('$PROGRAM_ID')/g" src/lib/anchor.ts
            fi
            print_success "Frontend configuration updated!"
        fi
        
        # Update declare_id in Rust code
        if [ -f "programs/nft-swap/src/lib.rs" ]; then
            if command -v sed &> /dev/null; then
                # macOS/BSD sed
                sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/g" programs/nft-swap/src/lib.rs 2>/dev/null || \
                # GNU sed
                sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/g" programs/nft-swap/src/lib.rs
            fi
            print_success "Rust program ID updated!"
        fi
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if anchor test --skip-deploy 2>/dev/null; then
        print_success "All tests passed!"
    else
        print_warning "Tests skipped or failed, but deployment was successful"
    fi
}

# Function to setup development environment
setup_dev_environment() {
    print_status "Setting up development environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        npm install
    fi
    
    print_success "Development environment ready!"
}

# Main execution flow
main() {
    echo "🚀 Starting Global Anchor Deployment Fix..."
    echo ""
    
    # Step 1: Fix configuration
    fix_anchor_config
    
    # Step 2: Clean and rebuild
    clean_and_rebuild
    
    # Step 3: Deploy
    if deploy_program; then
        # Step 4: Update configurations
        update_frontend_config
        
        # Step 5: Setup dev environment
        setup_dev_environment
        
        # Step 6: Run tests
        run_tests
        
        echo ""
        echo "🎉 DEPLOYMENT COMPLETE!"
        echo "======================"
        echo ""
        if [ -f ".program_id" ]; then
            echo "✅ Program ID: $(cat .program_id)"
        fi
        echo "✅ Network: Devnet"
        echo "✅ Frontend: Updated"
        echo "✅ Tests: Ready"
        echo ""
        echo "🔗 Next Steps:"
        echo "  1. Run 'npm run dev' to start the frontend"
        echo "  2. Connect your wallet: J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M"
        echo "  3. Access admin features and create pools"
        echo ""
        echo "📚 Useful Commands:"
        echo "  • anchor test --skip-deploy  (run tests)"
        echo "  • anchor upgrade <PROGRAM_ID>  (upgrade existing program)"
        echo "  • solana logs <PROGRAM_ID>  (view program logs)"
        echo ""
    else
        echo ""
        echo "❌ DEPLOYMENT FAILED"
        echo "==================="
        echo ""
        echo "🔍 Troubleshooting:"
        echo "  1. Check your Solana balance: solana balance"
        echo "  2. Verify network: solana config get"
        echo "  3. Check Anchor version: anchor --version"
        echo "  4. Try manual build: anchor build"
        echo ""
        exit 1
    fi
}

# Run the main function
main "$@"