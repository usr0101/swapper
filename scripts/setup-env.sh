#!/bin/bash

# Environment Setup Script
# This script helps set up environment variables securely

set -e

echo "🔒 Secure Environment Setup"
echo "=========================="

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

# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists!"
    echo "Do you want to:"
    echo "1) Backup existing .env and create new one"
    echo "2) Exit and manually edit existing .env"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Existing .env backed up"
    else
        print_status "Please manually edit your .env file"
        exit 0
    fi
fi

# Copy template
if [ ! -f ".env.example" ]; then
    print_error ".env.example not found!"
    exit 1
fi

cp .env.example .env
print_success ".env template created"

echo ""
echo "🔧 Let's configure your environment variables..."
echo ""

# Function to update env variable
update_env_var() {
    local var_name=$1
    local var_description=$2
    local var_example=$3
    local is_secret=${4:-false}
    
    echo "📝 $var_description"
    if [ "$var_example" != "" ]; then
        echo "   Example: $var_example"
    fi
    
    if [ "$is_secret" = true ]; then
        echo "   ⚠️  This is sensitive data - keep it secure!"
    fi
    
    read -p "   Enter value: " var_value
    
    if [ "$var_value" != "" ]; then
        # Escape special characters for sed
        escaped_value=$(echo "$var_value" | sed 's/[[\.*^$()+?{|]/\\&/g')
        
        # Update the .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${var_name}=.*|${var_name}=${escaped_value}|" .env
        else
            # Linux
            sed -i "s|^${var_name}=.*|${var_name}=${escaped_value}|" .env
        fi
        
        print_success "$var_name configured"
    else
        print_warning "$var_name left as placeholder"
    fi
    echo ""
}

# Configure each variable
echo "1️⃣ Supabase Configuration"
echo "   Get these from: https://supabase.com/dashboard"
echo ""
update_env_var "VITE_SUPABASE_URL" "Supabase Project URL" "https://your-project.supabase.co" true
update_env_var "VITE_SUPABASE_ANON_KEY" "Supabase Anonymous Key" "eyJ..." true

echo "2️⃣ Helius API Configuration"
echo "   Get your API key from: https://helius.xyz"
echo ""
update_env_var "VITE_HELIUS_API_KEY" "Helius API Key" "d260d547-..." true

echo "3️⃣ Admin Configuration"
echo ""
update_env_var "VITE_ADMIN_WALLET" "Admin Wallet Address" "J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M" false

echo "4️⃣ Network Configuration"
echo ""
echo "📝 Solana Network (devnet or mainnet-beta)"
echo "   Use 'devnet' for development, 'mainnet-beta' for production"
read -p "   Enter network [devnet]: " network_value
network_value=${network_value:-devnet}

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^VITE_SOLANA_NETWORK=.*|VITE_SOLANA_NETWORK=${network_value}|" .env
else
    sed -i "s|^VITE_SOLANA_NETWORK=.*|VITE_SOLANA_NETWORK=${network_value}|" .env
fi
print_success "VITE_SOLANA_NETWORK configured"
echo ""

echo "5️⃣ Program ID Configuration"
echo "   This will be set after you deploy your program"
echo "   You can update it later using the admin panel"
echo ""

# Verify .gitignore
print_status "Checking .gitignore configuration..."
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    print_success ".env is properly ignored by Git"
else
    print_warning "Adding .env to .gitignore"
    echo ".env" >> .gitignore
fi

# Final security check
echo ""
echo "🔒 Security Verification"
echo "======================="

# Check for placeholder values
placeholder_count=0
while IFS= read -r line; do
    if [[ $line == *"your_"* ]] || [[ $line == *"_here"* ]]; then
        placeholder_count=$((placeholder_count + 1))
        print_warning "Placeholder found: $line"
    fi
done < .env

if [ $placeholder_count -eq 0 ]; then
    print_success "No placeholders found - configuration looks good!"
else
    print_warning "$placeholder_count placeholder(s) still need to be configured"
fi

# Check file permissions
if [ "$(stat -c %a .env 2>/dev/null || stat -f %A .env 2>/dev/null)" != "600" ]; then
    print_status "Setting secure permissions on .env file..."
    chmod 600 .env
    print_success "File permissions set to 600 (owner read/write only)"
fi

echo ""
echo "🎉 Environment Setup Complete!"
echo "=============================="
echo ""
print_success "Your .env file has been configured"
print_status "Next steps:"
echo "  1. Deploy your Solana program: anchor deploy"
echo "  2. Update VITE_PROGRAM_ID in .env with your program ID"
echo "  3. Start the development server: npm run dev"
echo ""
print_warning "IMPORTANT SECURITY REMINDERS:"
echo "  • Never commit .env to version control"
echo "  • Keep your API keys secure"
echo "  • Use different credentials for dev/prod"
echo "  • Regularly rotate your API keys"
echo ""
print_status "For more security information, see: docs/SECURITY.md"