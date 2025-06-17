import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { NftSwap } from '../types/nft_swap';

// Program ID (can be updated via admin deployment)
export let PROGRAM_ID = new PublicKey('B4eBSHpFutVS5L2YtcwqvLKuEsENVQn5TH2uL6wwnt37');

// Function to update program ID (called from admin deployment)
export const updateProgramId = (newProgramId: string) => {
  try {
    PROGRAM_ID = new PublicKey(newProgramId);
    console.log('✅ Program ID updated to:', newProgramId);
    
    // Store in localStorage for persistence
    localStorage.setItem('swapper_program_id', newProgramId);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update program ID:', error);
    return false;
  }
};

// Load program ID from localStorage on startup
const loadStoredProgramId = () => {
  try {
    const storedId = localStorage.getItem('swapper_program_id');
    if (storedId) {
      PROGRAM_ID = new PublicKey(storedId);
      console.log('📋 Loaded stored program ID:', storedId);
    }
  } catch (error) {
    console.error('Error loading stored program ID:', error);
  }
};

// Initialize on module load
loadStoredProgramId();

// Connection to Solana cluster
export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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