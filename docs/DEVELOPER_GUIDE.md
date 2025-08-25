# 🚀 Solana NFT Swap Platform - Developer Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [Solana Program](#solana-program)
- [Frontend Components](#frontend-components)
- [API Integration](#api-integration)
- [Security Features](#security-features)
- [Deployment Guide](#deployment-guide)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Solana NFT Swap Platform is a decentralized application (dApp) that enables users to swap NFTs from the same collection through liquidity pools. The platform operates on Solana blockchain and provides atomic swaps with configurable fees.

### Key Features
- **Atomic NFT Swaps**: Simultaneous exchange of NFTs in a single transaction
- **Collection Pools**: Dedicated pools for specific NFT collections
- **Admin Dashboard**: Complete pool management and platform configuration
- **Real-time Data**: Live NFT metadata via Helius API
- **Secure Wallet Management**: Encrypted private key storage for pool operations
- **Dynamic Branding**: Customizable platform appearance
- **Multi-network Support**: Devnet and Mainnet compatibility

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Solana        │
│   (React/Vite)  │◄──►│   Database      │    │   Blockchain    │
│                 │    │                 │    │                 │
│ • SwapInterface │    │ • Pool Config   │    │ • Smart Contract│
│ • AdminDashboard│    │ • Wallet Data   │    │ • NFT Metadata  │
│ • WalletConnect │    │ • Settings      │    │ • Transactions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Helius API    │
                    │                 │
                    │ • NFT Metadata  │
                    │ • Wallet Assets │
                    │ • Collection    │
                    │   Information   │
                    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Wallet Integration**: Solana Wallet Adapter
- **Icons**: Lucide React

### Backend Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Wallet-based authentication
- **File Storage**: Not required (metadata via APIs)

### Blockchain
- **Network**: Solana (Devnet/Mainnet)
- **Smart Contract**: Anchor Framework (Rust)
- **RPC Provider**: Helius API
- **Wallet Support**: Phantom, Solflare, and other Solana wallets

### APIs & Services
- **NFT Data**: Helius API
- **Collection Stats**: Magic Eden API (proxy)
- **Network**: Solana RPC endpoints

### Development Tools
- **Package Manager**: npm
- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Deployment**: Netlify

## 🗄️ Database Schema

### Tables Overview

#### 1. `pools` - Collection Pool Configuration
```sql
CREATE TABLE pools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id text UNIQUE NOT NULL,
    collection_name text NOT NULL,
    collection_symbol text NOT NULL,
    collection_image text NOT NULL,
    collection_address text NOT NULL,
    pool_address text NOT NULL,
    swap_fee double precision NOT NULL,
    created_at timestamptz DEFAULT now(),
    created_by text NOT NULL,
    is_active boolean DEFAULT true,
    nft_count integer DEFAULT 0,
    total_volume bigint DEFAULT 0,
    description text
);
```

**Purpose**: Stores configuration for each NFT collection pool
**Key Fields**:
- `collection_id`: Unique identifier for the pool
- `pool_address`: Solana wallet address that holds pool NFTs
- `swap_fee`: Fee charged per swap (in SOL)
- `total_volume`: Cumulative trading volume (in lamports)

#### 2. `pool_wallets` - Encrypted Wallet Data
```sql
CREATE TABLE pool_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_address text UNIQUE NOT NULL,
    public_key text NOT NULL,
    encrypted_secret_key text NOT NULL,
    has_private_key boolean NOT NULL,
    created_at timestamptz DEFAULT now()
);
```

**Purpose**: Securely stores wallet credentials for pool operations
**Security**: Private keys are base64 encoded (production should use proper encryption)
**Key Fields**:
- `encrypted_secret_key`: Base64 encoded private key
- `has_private_key`: Flag indicating swap capability

#### 3. `admin_settings` - Platform Configuration
```sql
CREATE TABLE admin_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet text UNIQUE NOT NULL,
    fee_collector_wallet text NOT NULL,
    default_swap_fee double precision NOT NULL,
    platform_active boolean NOT NULL,
    maintenance_message text NOT NULL,
    helius_api_key text NOT NULL,
    network text NOT NULL,
    platform_name text DEFAULT 'Swapper',
    platform_description text DEFAULT 'Real NFT Exchange',
    platform_icon text DEFAULT '⚡',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

**Purpose**: Stores admin configuration and platform branding
**Key Fields**:
- `platform_name/description/icon`: Dynamic branding
- `fee_collector_wallet`: Where swap fees are sent
- `network`: 'devnet' or 'mainnet-beta'

#### 4. `api_configs` - API Configuration
```sql
CREATE TABLE api_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet text UNIQUE NOT NULL,
    helius_api_key text NOT NULL,
    helius_rpc text NOT NULL,
    network text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

**Purpose**: Stores API keys and RPC endpoints per user

### Row Level Security (RLS)
- **Enabled** on all tables
- **Public read** for active pools (browsing)
- **User-specific access** for settings and configurations
- **Admin-only access** for sensitive operations
- **Pool owner access** for wallet data

## 🔗 Solana Program

### Smart Contract Overview
- **Framework**: Anchor 0.29.0
- **Language**: Rust
- **Program ID**: `A3qF2mqUjWKzcAFfLPspXxznaAa5KnAfexWuQuSNQwjz` (configurable)

### Instructions

#### 1. `initialize_pool`
```rust
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    collection_id: String,
    swap_fee: u64,
) -> Result<()>
```
**Purpose**: Creates a new pool for a collection
**Parameters**:
- `collection_id`: Unique identifier (max 32 chars)
- `swap_fee`: Fee in lamports

#### 2. `update_pool_stats`
```rust
pub fn update_pool_stats(
    ctx: Context<UpdatePoolStats>,
    nft_count: u32,
    volume: u64,
) -> Result<()>
```
**Purpose**: Updates pool statistics
**Access**: Pool authority only

#### 3. `deposit_sol`
```rust
pub fn deposit_sol(
    ctx: Context<DepositSol>,
    amount: u64,
) -> Result<()>
```
**Purpose**: Deposits SOL into pool
**Validation**: Rent-exemption checks

#### 4. `withdraw_sol`
```rust
pub fn withdraw_sol(
    ctx: Context<WithdrawSol>,
    amount: u64,
) -> Result<()>
```
**Purpose**: Withdraws SOL from pool
**Access**: Pool authority only

#### 5. `create_swap_order`
```rust
pub fn create_swap_order(
    ctx: Context<CreateSwapOrder>,
    nft_mint: Pubkey,
    desired_traits: Vec<String>,
) -> Result<()>
```
**Purpose**: Creates a swap order with trait preferences

#### 6. `execute_swap`
```rust
pub fn execute_swap(
    ctx: Context<ExecuteSwap>,
    swap_fee: u64,
) -> Result<()>
```
**Purpose**: Executes the actual swap with fee payment

### Account Structures

#### Pool Account
```rust
pub struct Pool {
    pub authority: Pubkey,
    pub collection_id: String,
    pub swap_fee: u64,
    pub nft_count: u32,
    pub total_volume: u64,
    pub bump: u8,
}
```

#### Swap Order Account
```rust
pub struct SwapOrder {
    pub user: Pubkey,
    pub nft_mint: Pubkey,
    pub desired_traits: Vec<String>,
    pub is_active: bool,
    pub bump: u8,
}
```

### Events
All instructions emit structured events for monitoring:
- `PoolInitialized`
- `PoolStatsUpdated`
- `SolDeposited`
- `SolWithdrawn`
- `SwapOrderCreated`
- `SwapExecuted`

### Security Features
- **Rent-exemption validation**
- **Overflow protection**
- **Input validation**
- **Authority checks**
- **Event emissions for monitoring**

## 🎨 Frontend Components

### Core Components

#### 1. `SwapInterface`
**File**: `src/components/SwapInterface.tsx`
**Purpose**: Main user interface for NFT swapping
**Features**:
- Collection pool selection
- NFT browsing and selection
- Swap execution with validation
- Real-time data loading

#### 2. `AdminDashboard`
**File**: `src/components/AdminDashboard.tsx`
**Purpose**: Administrative interface
**Features**:
- Pool management (CRUD operations)
- Platform settings configuration
- Statistics overview
- Program deployment tools

#### 3. `SwapModal`
**File**: `src/components/SwapModal.tsx`
**Purpose**: Swap confirmation and execution
**Features**:
- Transaction preview
- Fee calculation
- Atomic swap execution
- Progress tracking

#### 4. `CreatePoolModal`
**File**: `src/components/CreatePoolModal.tsx`
**Purpose**: Pool creation interface
**Features**:
- Collection validation
- Wallet generation/import
- Configuration setup

#### 5. `NFTCard`
**File**: `src/components/NFTCard.tsx`
**Purpose**: NFT display component
**Features**:
- Image loading with fallbacks
- Metadata display
- Selection handling
- Trait information

### Context Providers

#### `WalletContext`
**File**: `src/contexts/WalletContext.tsx`
**Purpose**: Wallet state management
**Features**:
- Multi-wallet support
- Balance tracking
- Network switching
- Admin detection
- Platform branding management

### Utility Libraries

#### 1. `solana.ts`
**File**: `src/lib/solana.ts`
**Purpose**: Solana blockchain interactions
**Functions**:
- `getUserNFTs()`: Fetch user's NFTs
- `getPoolNFTs()`: Fetch pool NFTs
- `executeSwapTransaction()`: Atomic swap execution
- `validateTransaction()`: Pre-swap validation

#### 2. `helius-api.ts`
**File**: `src/lib/helius-api.ts`
**Purpose**: NFT metadata and blockchain data
**Functions**:
- `getWalletNFTs()`: Fetch NFTs by owner
- `searchNFTByMint()`: Get specific NFT data
- `getWalletBalance()`: Get SOL balance

#### 3. `supabase.ts`
**File**: `src/lib/supabase.ts`
**Purpose**: Database operations
**Functions**:
- Pool CRUD operations
- Settings management
- Wallet data encryption/decryption
- Migration utilities

#### 4. `pool-manager.ts`
**File**: `src/lib/pool-manager.ts`
**Purpose**: Pool management logic
**Functions**:
- Pool creation with wallet generation
- Statistics calculation
- Wallet data management

## 🔌 API Integration

### Helius API
**Purpose**: NFT metadata and blockchain data
**Endpoints Used**:
- `getAssetsByOwner`: Get NFTs by wallet
- `getAsset`: Get specific NFT metadata
- `getAssetsByGroup`: Get collection NFTs
- `getBalance`: Get wallet SOL balance

**Configuration**:
```typescript
const rpcUrl = `https://${network}.helius-rpc.com/?api-key=${apiKey}`;
```

### Magic Eden API (Proxied)
**Purpose**: Collection statistics
**Endpoint**: `/api/magiceden/v2/collections/{symbol}/stats`
**Proxy Configuration** (vite.config.ts):
```typescript
server: {
  proxy: {
    '/api/magiceden': {
      target: 'https://api-devnet.magiceden.dev',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/magiceden/, ''),
    }
  }
}
```

### Supabase API
**Purpose**: Database operations
**Features**:
- Real-time subscriptions
- Row Level Security
- Automatic API generation
- Built-in authentication

## 🔒 Security Features

### 1. Environment Variables
All sensitive data stored in environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_HELIUS_API_KEY=your_helius_key
VITE_ADMIN_WALLET=admin_wallet_address
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=your_program_id
```

### 2. Wallet Security
- Private keys encrypted with base64 (upgrade to proper encryption for production)
- Wallet access validation before swaps
- Separate wallets for different environments

### 3. Transaction Security
- Atomic swaps prevent partial failures
- Rent-exemption validation
- Overflow protection in smart contract
- Fee validation and collection

### 4. Database Security
- Row Level Security (RLS) enabled
- User-specific data access
- Admin-only sensitive operations
- Encrypted sensitive fields

### 5. Input Validation
- Client-side validation
- Smart contract parameter validation
- SQL injection prevention via Supabase
- XSS protection via React

## 🚀 Deployment Guide

### Prerequisites
1. **Solana CLI** installed and configured
2. **Anchor CLI** for smart contract deployment
3. **Node.js** and npm
4. **Supabase** project setup
5. **Helius API** key

### Smart Contract Deployment
```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta
```

### Frontend Deployment
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Netlify (automatic via Git)
# Or manually upload dist/ folder
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in all required values
3. Update program ID after deployment
4. Configure Supabase database
5. Set up Helius API key

### Database Setup
1. Create Supabase project
2. Run migrations in order:
   - `20250617125256_precious_lantern.sql`
   - `20250617125905_orange_snow.sql`
   - `20250617134254_dusty_tooth.sql`
   - `20250717192506_sparkling_haze.sql`
3. Configure RLS policies
4. Set up admin user

## 💻 Development Setup

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd solana-nft-swap-platform

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# In another terminal, start Solana test validator (optional)
solana-test-validator
```

### Development Workflow
1. **Smart Contract Changes**:
   ```bash
   anchor build
   anchor test
   anchor deploy --provider.cluster devnet
   ```

2. **Frontend Changes**:
   - Hot reload automatically updates
   - TypeScript compilation on save
   - ESLint checks on commit

3. **Database Changes**:
   - Create new migration files
   - Test on development database
   - Apply to production

### Useful Scripts
```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Smart Contract
anchor build         # Build program
anchor test          # Run tests
anchor deploy        # Deploy program

# Utilities
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all tests
anchor test

# Run specific test
anchor test --skip-deploy tests/nft-swap.ts
```

### Frontend Testing
- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: Full user flow testing
- **E2E Tests**: Cypress for end-to-end testing

### Manual Testing Checklist
- [ ] Wallet connection/disconnection
- [ ] Pool creation with different configurations
- [ ] NFT loading and display
- [ ] Swap execution (successful and failed)
- [ ] Admin dashboard functionality
- [ ] Network switching
- [ ] Error handling and edge cases

## 🔧 Troubleshooting

### Common Issues

#### 1. "Program ID not found"
**Solution**: Update program ID in environment variables and redeploy

#### 2. "Insufficient funds for swap"
**Solution**: Ensure user has enough SOL for fees + transaction costs

#### 3. "Pool wallet access required"
**Solution**: Verify pool has private key stored and `has_private_key` is true

#### 4. "NFTs not loading"
**Solution**: Check Helius API key and network configuration

#### 5. "Database connection failed"
**Solution**: Verify Supabase URL and keys in environment variables

### Debug Tools
- **Solana Explorer**: View transactions and accounts
- **Browser DevTools**: Network requests and console logs
- **Supabase Dashboard**: Database queries and logs
- **Anchor Logs**: Smart contract execution logs

### Performance Optimization
- **Image Loading**: Lazy loading with fallbacks
- **API Caching**: Cache NFT metadata locally
- **Database Queries**: Optimize with indexes
- **Bundle Size**: Code splitting and tree shaking

## 📚 Additional Resources

### Documentation
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://book.anchor-lang.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Helius API Docs](https://docs.helius.xyz/)

### Tools
- [Solana Explorer](https://explorer.solana.com/)
- [Phantom Wallet](https://phantom.app/)
- [Solflare Wallet](https://solflare.com/)

### Community
- [Solana Discord](https://discord.gg/solana)
- [Anchor Discord](https://discord.gg/anchor)

---

## 📝 Notes for Developers

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Automatic formatting
- **Naming**: camelCase for variables, PascalCase for components

### Architecture Decisions
- **Context over Redux**: Simpler state management
- **Supabase over custom backend**: Faster development
- **Helius over direct RPC**: Better NFT metadata
- **Atomic swaps**: Security and reliability

### Future Enhancements
- [ ] Multi-collection swaps
- [ ] Trait-based matching
- [ ] Liquidity mining rewards
- [ ] Mobile app development
- [ ] Advanced analytics dashboard

This documentation provides a comprehensive overview for developers working on or integrating with the Solana NFT Swap Platform.