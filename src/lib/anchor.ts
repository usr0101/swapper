import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { NftSwap } from '../types/nft_swap';

// SECURITY FIX: Get Program ID from environment variables with network-specific fallbacks
const getNetworkSpecificProgramId = () => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  
  // Try environment variable first
  const envProgramId = import.meta.env.VITE_PROGRAM_ID;
  if (envProgramId && envProgramId !== 'your_deployed_program_id_here') {
    return envProgramId;
  }
  
  // Network-specific fallbacks (these should be different for each network)
  const networkProgramIds = {
    'devnet': 'DEVNET_PROGRAM_ID_PLACEHOLDER',
    'mainnet-beta': 'MAINNET_PROGRAM_ID_PLACEHOLDER',
    'localnet': 'LOCALNET_PROGRAM_ID_PLACEHOLDER'
  };
  
  const programId = networkProgramIds[network as keyof typeof networkProgramIds];
  
  if (!programId || programId.includes('PLACEHOLDER')) {
    console.warn(`⚠️ No valid Program ID found for network: ${network}`);
    console.warn('Please set VITE_PROGRAM_ID in your .env file');
    // Return a default that will fail gracefully
    return 'B4eBSHpFutVS5L2YtcwqvLKuEsENVQn5TH2uL6wwnt37';
  }
  
  return programId;
};

// SECURITY FIX: Dynamic Program ID based on environment
export let PROGRAM_ID = new PublicKey(getNetworkSpecificProgramId());

// Function to update program ID (called from admin deployment)
export const updateProgramId = (newProgramId: string) => {
  try {
    PROGRAM_ID = new PublicKey(newProgramId);
    console.log('✅ Program ID updated to:', newProgramId);
    
    // Store in localStorage for persistence (not sensitive data)
    localStorage.setItem('swapper_program_id', newProgramId);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update program ID:', error);
    return false;
  }
};

// Load program ID from localStorage on startup (fallback)
const loadStoredProgramId = () => {
  try {
    const storedId = localStorage.getItem('swapper_program_id');
    if (storedId && storedId !== getNetworkSpecificProgramId()) {
      PROGRAM_ID = new PublicKey(storedId);
      console.log('📋 Loaded stored program ID:', storedId);
    }
  } catch (error) {
    console.error('Error loading stored program ID:', error);
  }
};

// Initialize on module load
loadStoredProgramId();

// SECURITY FIX: Dynamic connection based on environment
const getConnection = () => {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  
  // Use environment-specific RPC endpoints
  if (network === 'mainnet-beta') {
    // For mainnet, use a reliable RPC provider
    return new Connection(
      import.meta.env.VITE_MAINNET_RPC_URL || clusterApiUrl('mainnet-beta'),
      'confirmed'
    );
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
export const connection = getConnection();

// Get Anchor provider
export const getProvider = (wallet: AnchorWallet) => {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
};

// Get program instance
export const getProgram = (wallet: AnchorWallet) => {
  const provider = getProvider(wallet);
  return new Program<NftSwap>(IDL, PROGRAM_ID, provider);
};

// Helper function to get pool PDA
export const getPoolPDA = (collectionId: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), Buffer.from(collectionId)],
    PROGRAM_ID
  );
};

// Helper function to get associated token account
export const getAssociatedTokenAccount = async (
  mint: PublicKey,
  owner: PublicKey
) => {
  const { getAssociatedTokenAddress } = await import('@solana/spl-token');
  return await getAssociatedTokenAddress(mint, owner);
};

// Get current program ID
export const getCurrentProgramId = () => PROGRAM_ID.toString();

// Get current network
export const getCurrentNetwork = () => import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// Validate environment configuration
export const validateEnvironment = () => {
  const issues = [];
  
  const programId = import.meta.env.VITE_PROGRAM_ID;
  if (!programId || programId === 'your_deployed_program_id_here') {
    issues.push('VITE_PROGRAM_ID not set or using placeholder value');
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
  "errors": [
    { "code": 6000, "name": "Unauthorized", "msg": "Unauthorized access" },
    { "code": 6001, "name": "InsufficientFunds", "msg": "Insufficient funds" },
    { "code": 6002, "name": "InvalidOperation", "msg": "Invalid operation" },
    { "code": 6003, "name": "InvalidCollectionId", "msg": "Collection ID must be 32 characters or less" }
  ]
};