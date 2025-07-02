import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { NftSwap } from '../types/nft_swap';

// SECURITY FIX: Immutable Program ID - no runtime updates allowed
const PROGRAM_IDS = {
  devnet: new PublicKey('A3qF2mqUjWKzcAFfLPspXxznaAa5KnAfexWuQuSNQwjz'),
  'mainnet-beta': new PublicKey('A3qF2mqUjWKzcAFfLPspXxznaAa5KnAfexWuQuSNQwjz'), // Replace with actual mainnet ID
  localnet: new PublicKey('A3qF2mqUjWKzcAFfLPspXxznaAa5KnAfexWuQuSNQwjz')
} as const;

// SECURITY FIX: Get Program ID based on environment, no runtime mutation
const getProgramId = (): PublicKey => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  
  if (network in PROGRAM_IDS) {
    return PROGRAM_IDS[network as keyof typeof PROGRAM_IDS];
  }
  
  console.warn(`Unknown network: ${network}, falling back to devnet`);
  return PROGRAM_IDS.devnet;
};

// SECURITY FIX: Dynamic connection based on environment with proper validation
const getConnection = (): Connection => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  
  // Validate network value
  if (!['devnet', 'mainnet-beta', 'localnet'].includes(network)) {
    console.error(`Invalid network: ${network}`);
    throw new Error('Invalid network configuration');
  }
  
  // Use environment-specific RPC endpoints
  if (network === 'mainnet-beta') {
    // For mainnet, use a reliable RPC provider
    const mainnetRpc = import.meta.env.VITE_MAINNET_RPC_URL;
    if (mainnetRpc && !mainnetRpc.includes('your_')) {
      return new Connection(mainnetRpc, 'confirmed');
    }
    return new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  } else if (network === 'devnet') {
    // For devnet, use Helius or fallback to public RPC
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
    if (heliusKey && heliusKey !== 'your_helius_api_key_here') {
      return new Connection(
        `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
        'confirmed'
      );
    }
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
  } else {
    // Localnet
    return new Connection('http://localhost:8899', 'confirmed');
  }
};

// Connection to Solana cluster
const connection = getConnection();

// Get Anchor provider
const getProvider = (wallet: AnchorWallet): AnchorProvider => {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
};

// Get program instance
const getProgram = (wallet: AnchorWallet): Program<NftSwap> => {
  const provider = getProvider(wallet);
  return new Program<NftSwap>(IDL, getProgramId(), provider);
};

// Helper function to get pool PDA
const getPoolPDA = (collectionId: string): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), Buffer.from(collectionId)],
    getProgramId()
  );
};

// Helper function to get swap order PDA
const getSwapOrderPDA = (user: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('swap_order'), user.toBuffer()],
    getProgramId()
  );
};

// Helper function to get associated token account
const getAssociatedTokenAccount = async (
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> => {
  const { getAssociatedTokenAddress } = await import('@solana/spl-token');
  return await getAssociatedTokenAddress(mint, owner);
};

// Get current program ID (read-only)
export const getCurrentProgramId = (): string => getProgramId().toString();

// Get current network
const getCurrentNetwork = (): string => import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// SECURITY FIX: Enhanced environment validation
export const validateEnvironment = (): boolean => {
  const issues: string[] = [];
  
  const programId = getCurrentProgramId();
  if (!programId || programId === '11111111111111111111111111111111') {
    issues.push('Program ID not properly set');
  }
  
  const network = getCurrentNetwork();
  if (!['devnet', 'mainnet-beta', 'localnet'].includes(network)) {
    issues.push('Invalid VITE_SOLANA_NETWORK value');
  }
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url_here') {
    issues.push('VITE_SUPABASE_URL not set or using placeholder value');
  }
  
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
    issues.push('VITE_SUPABASE_ANON_KEY not set or using placeholder value');
  }
  
  const adminWallet = import.meta.env.VITE_ADMIN_WALLET;
  if (!adminWallet || adminWallet === 'your_admin_wallet_address_here') {
    issues.push('VITE_ADMIN_WALLET not set or using placeholder value');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Environment configuration issues:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
    console.warn('Please check your .env file and update the values');
  }
  
  return issues.length === 0;
};

// Export helper functions
export { getProgram, getProvider, getPoolPDA, getSwapOrderPDA, getAssociatedTokenAccount, connection };

// Updated IDL for the deployed program
const IDL = {
  "version": "0.1.0",
  "name": "nft_swap",
  "instructions": [
    {
      "name": "initializePool",
      "accounts": [
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "collectionId", "type": "string" },
        { "name": "swapFee", "type": "u64" }
      ]
    },
    {
      "name": "updatePoolStats",
      "accounts": [
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true }
      ],
      "args": [
        { "name": "nftCount", "type": "u32" },
        { "name": "volume", "type": "u64" }
      ]
    },
    {
      "name": "depositSol",
      "accounts": [
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "withdrawSol",
      "accounts": [
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "createSwapOrder",
      "accounts": [
        { "name": "swapOrder", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "nftMint", "type": "publicKey" },
        { "name": "desiredTraits", "type": { "vec": "string" } }
      ]
    },
    {
      "name": "executeSwap",
      "accounts": [
        { "name": "pool", "isMut": true, "isSigner": false },
        { "name": "swapOrder", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "feeCollector", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "swapFee", "type": "u64" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Pool",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "collectionId", "type": "string" },
          { "name": "swapFee", "type": "u64" },
          { "name": "nftCount", "type": "u32" },
          { "name": "totalVolume", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "SwapOrder",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "publicKey" },
          { "name": "nftMint", "type": "publicKey" },
          { "name": "desiredTraits", "type": { "vec": "string" } },
          { "name": "isActive", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "PoolInitialized",
      "fields": [
        { "name": "pool", "type": "publicKey" },
        { "name": "authority", "type": "publicKey" },
        { "name": "collectionId", "type": "string" },
        { "name": "swapFee", "type": "u64" },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "PoolStatsUpdated",
      "fields": [
        { "name": "pool", "type": "publicKey" },
        { "name": "oldNftCount", "type": "u32" },
        { "name": "newNftCount", "type": "u32" },
        { "name": "volumeAdded", "type": "u64" },
        { "name": "totalVolume", "type": "u64" },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "SolDeposited",
      "fields": [
        { "name": "pool", "type": "publicKey" },
        { "name": "user", "type": "publicKey" },
        { "name": "amount", "type": "u64" },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "SolWithdrawn",
      "fields": [
        { "name": "pool", "type": "publicKey" },
        { "name": "authority", "type": "publicKey" },
        { "name": "amount", "type": "u64" },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "SwapOrderCreated",
      "fields": [
        { "name": "swapOrder", "type": "publicKey" },
        { "name": "user", "type": "publicKey" },
        { "name": "nftMint", "type": "publicKey" },
        { "name": "desiredTraits", "type": { "vec": "string" } },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "SwapExecuted",
      "fields": [
        { "name": "pool", "type": "publicKey" },
        { "name": "swapOrder", "type": "publicKey" },
        { "name": "user", "type": "publicKey" },
        { "name": "feeCollector", "type": "publicKey" },
        { "name": "swapFee", "type": "u64" },
        { "name": "timestamp", "type": "i64" }
      ]
    }
  ],
  "errors": [
    { "code": 6000, "name": "Unauthorized", "msg": "Unauthorized access" },
    { "code": 6001, "name": "InsufficientFunds", "msg": "Insufficient funds" },
    { "code": 6002, "name": "InvalidOperation", "msg": "Invalid operation" },
    { "code": 6003, "name": "InvalidCollectionId", "msg": "Collection ID must be between 1 and 32 characters" },
    { "code": 6004, "name": "ArithmeticOverflow", "msg": "Arithmetic overflow occurred" },
    { "code": 6005, "name": "InvalidAmount", "msg": "Invalid amount - must be greater than 0" },
    { "code": 6006, "name": "AmountTooLarge", "msg": "Amount too large - maximum 100 SOL" },
    { "code": 6007, "name": "InsufficientRentExemption", "msg": "Account would not be rent exempt" },
    { "code": 6008, "name": "TooManyTraits", "msg": "Too many traits - maximum 10 allowed" },
    { "code": 6009, "name": "TraitNameTooLong", "msg": "Trait name too long - maximum 50 characters" },
    { "code": 6010, "name": "InvalidFeeCollector", "msg": "Invalid fee collector account" },
    { "code": 6011, "name": "InvalidFeeAmount", "msg": "Invalid fee amount - must match pool requirements" }
  ]
} as const;