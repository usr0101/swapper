# 🔥 Swapper - Premium NFT Exchange Platform

A production-ready NFT swap platform built on Solana with real-time data integration, atomic swaps, and enterprise-grade security.

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo>
cd solana-nft-swap-platform
npm install
```

### 2. Secure Environment Setup
```bash
# Run the interactive setup script
./scripts/setup-env.sh

# Or manually copy and edit
cp .env.example .env
# Edit .env with your actual values
```

### 3. Deploy Smart Contract
```bash
# Build and deploy to devnet
anchor build
anchor deploy --provider.cluster devnet

# Update .env with your Program ID
echo "VITE_PROGRAM_ID=your_program_id_here" >> .env
```

### 4. Start Development
```bash
npm run dev
```

## 🔒 Security Features

### ✅ Environment Security
- All sensitive data in environment variables
- No hardcoded API keys or credentials
- Separate configurations for dev/prod
- Secure file permissions

### ✅ Network Isolation
- Separate Program IDs for each environment
- Environment-specific RPC endpoints
- Proper cluster isolation

### ✅ API Security
- Rate limiting and error handling
- Secure API key management
- Fallback endpoints for reliability

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **Solana Wallet Adapter** for wallet integration

### Backend
- **Supabase** for database and real-time features
- **Helius API** for NFT data and RPC
- **Anchor Framework** for Solana programs

### Blockchain
- **Solana** blockchain
- **SPL Token** standard
- **Metaplex** for NFT metadata

## 📋 Environment Variables

Create a `.env` file with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Helius API Configuration  
VITE_HELIUS_API_KEY=your_helius_api_key

# Admin Configuration
VITE_ADMIN_WALLET=your_admin_wallet_address

# Network Configuration
VITE_SOLANA_NETWORK=devnet

# Program ID (set after deployment)
VITE_PROGRAM_ID=your_deployed_program_id
```

## 🎯 Features

### 🔄 Atomic NFT Swaps
- Simultaneous NFT exchange in single transaction
- Both parties sign the same transaction
- No risk of partial completion

### 📊 Real-Time Data
- Live NFT metadata from Helius API
- Real-time balance updates
- Dynamic collection statistics

### 👑 Admin Dashboard
- Pool management interface
- Platform configuration
- User analytics and monitoring

### 🎨 Dynamic Branding
- Customizable platform name and description
- Dynamic favicon and meta tags
- Responsive design system

### 🔐 Enterprise Security
- Environment-based configuration
- Secure API key management
- Network isolation
- Audit logging

## 🚀 Deployment

### Development (Devnet)
```bash
# Setup environment
./scripts/setup-env.sh

# Deploy program
anchor deploy --provider.cluster devnet

# Start frontend
npm run dev
```

### Production (Mainnet)
```bash
# Set mainnet environment
echo "VITE_SOLANA_NETWORK=mainnet-beta" >> .env

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# Build for production
npm run build

# Deploy to hosting service
npm run deploy
```

## 📚 Documentation

- [Security Guide](docs/SECURITY.md) - Security best practices
- [API Setup](docs/API_SETUP.md) - Free API configuration
- [Deployment Guide](scripts/deploy.sh) - Automated deployment

## 🔧 Development Scripts

```bash
# Environment setup
./scripts/setup-env.sh

# Quick deployment
./scripts/quick-deploy.sh

# Fix deployment issues
./scripts/fix-deployment.sh

# Get devnet SOL
./scripts/get-sol.sh
```

## 🌐 Live Demo

- **Devnet**: [https://statuesque-piroshki-82ea55.netlify.app](https://statuesque-piroshki-82ea55.netlify.app)
- **Explorer**: View transactions on Solana Explorer
- **Admin**: Connect with admin wallet for full features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Security**: See [SECURITY.md](docs/SECURITY.md)

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.org/) for the blockchain platform
- [Anchor](https://anchor-lang.com/) for the development framework
- [Helius](https://helius.xyz/) for NFT data APIs
- [Supabase](https://supabase.com/) for backend services

---

**⚠️ Security Notice**: This platform handles valuable NFTs and cryptocurrency. Always verify transactions and use secure practices. See [SECURITY.md](docs/SECURITY.md) for detailed security guidelines.