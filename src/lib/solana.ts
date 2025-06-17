import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getWalletNFTs, getWalletBalance, updateHeliusConnection, searchNFTByMint, getCurrentNetworkInfo } from './helius-api';
import { getAllPools, getPool, updatePoolStats, getPoolWalletData } from './pool-manager';
import { getAdminSettings } from './supabase';

export const getConnection = () => {
  return updateHeliusConnection();
};

export const connection = getConnection();

// Get fee collector address from Supabase admin settings
const getFeeCollectorAddress = async (userWallet?: string) => {
  try {
    if (userWallet) {
      const adminSettings = await getAdminSettings(userWallet);
      
      if (adminSettings?.fee_collector_wallet) {
        try {
          const pubkey = new PublicKey(adminSettings.fee_collector_wallet);
          return pubkey;
        } catch (error) {
          console.error('Invalid fee collector address format:', adminSettings.fee_collector_wallet, error);
        }
      }
    }
  } catch (error) {
    console.error('Error loading fee collector from Supabase:', error);
  }
  
  const defaultFeeCollector = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  return new PublicKey(defaultFeeCollector);
};

// Get REAL NFTs from user's wallet for a specific collection
export const getUserNFTs = async (publicKey: PublicKey, collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) {
      return [];
    }
    
    const allNFTs = await getWalletNFTs(publicKey.toString(), publicKey.toString());
    
    if (allNFTs.length === 0) {
      return [];
    }
    
    let collectionNFTs = [];
    
    if (pool.collection_address && pool.collection_address !== '') {
      collectionNFTs = allNFTs.filter(nft => {
        return nft.collection === pool.collection_address ||
               nft.collection?.toLowerCase() === pool.collection_address.toLowerCase();
      });
    }
    
    if (collectionNFTs.length === 0) {
      collectionNFTs = allNFTs.filter(nft => {
        const nftName = nft.name?.toLowerCase() || '';
        const nftSymbol = nft.symbol?.toLowerCase() || '';
        const poolName = pool.collection_name?.toLowerCase() || '';
        const poolSymbol = pool.collection_symbol?.toLowerCase() || '';
        
        return nftName.includes(poolName.split(' ')[0]) ||
               nftSymbol.includes(poolSymbol) ||
               nftName.includes(poolSymbol);
      });
    }
    
    if (collectionNFTs.length === 0 && collectionId === 'swapper-collection') {
      collectionNFTs = allNFTs.slice(0, 10);
    }
    
    return collectionNFTs;
    
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    return [];
  }
};

// Get REAL pool NFTs
export const getPoolNFTs = async (collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) {
      return [];
    }
    
    if (!isValidSolanaAddress(pool.pool_address)) {
      return [];
    }
    
    const poolNFTs = await getWalletNFTs(pool.pool_address);
    
    if (poolNFTs.length === 0) {
      return [];
    }
    
    let filteredPoolNFTs = [];
    
    if (pool.collection_address && pool.collection_address !== '') {
      filteredPoolNFTs = poolNFTs.filter(nft => {
        return nft.collection === pool.collection_address ||
               nft.collection?.toLowerCase() === pool.collection_address.toLowerCase();
      });
    } else {
      filteredPoolNFTs = poolNFTs.filter(nft => {
        const nftName = nft.name?.toLowerCase() || '';
        const nftSymbol = nft.symbol?.toLowerCase() || '';
        const poolName = pool.collection_name?.toLowerCase() || '';
        const poolSymbol = pool.collection_symbol?.toLowerCase() || '';
        
        return nftName.includes(poolName.split(' ')[0]) ||
               nftSymbol.includes(poolSymbol) ||
               nftName.includes(poolSymbol);
      });
    }
    
    return filteredPoolNFTs;
    
  } catch (error) {
    console.error('Error fetching pool NFTs:', error);
    return [];
  }
};

// Get user's SOL balance using Helius
export const getUserBalance = async (publicKey: PublicKey) => {
  try {
    const balance = await getWalletBalance(publicKey.toString(), publicKey.toString());
    return balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

// Atomic NFT swap with proper transaction structure
export const executeSwapTransaction = async (
  userWallet: PublicKey,
  userNFTMint: string,
  poolNFTMint: string,
  collectionId: string,
  wallet: any
) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) {
      throw new Error('Pool not found for collection');
    }
    
    const feeCollectorAddress = await getFeeCollectorAddress(userWallet.toString());
    const connection = await getConnection();
    
    // Verify pool wallet access
    const poolWalletData = await getPoolWalletData(pool.pool_address);
    
    if (!poolWalletData || !poolWalletData.secretKey) {
      throw new Error('ATOMIC SWAP FAILED: Pool wallet private key not found. Both NFTs must be exchanged simultaneously, but the pool cannot authorize the transfer of its NFT. This requires both parties to sign the same transaction.');
    }
    
    const networkInfo = await getCurrentNetworkInfo(userWallet.toString());
    
    // Validate both NFTs exist and are from same collection
    const userNFT = await searchNFTByMint(userNFTMint, userWallet.toString());
    const poolNFT = await searchNFTByMint(poolNFTMint, userWallet.toString());
    
    if (!userNFT) {
      throw new Error('User NFT not found or invalid');
    }
    
    if (!poolNFT) {
      throw new Error('Pool NFT not found or invalid');
    }
    
    // Verify collection matching
    const userCollection = userNFT.collection || '';
    const poolCollection = poolNFT.collection || '';
    
    if (pool.collection_address && pool.collection_address !== '') {
      if (userCollection !== pool.collection_address || poolCollection !== pool.collection_address) {
        throw new Error('ATOMIC SWAP FAILED: Both NFTs must be from the same verified collection');
      }
    } else {
      if (userCollection !== poolCollection && userCollection !== '' && poolCollection !== '') {
        throw new Error('ATOMIC SWAP FAILED: Both NFTs must be from the same collection');
      }
    }
    
    // Verify ownership
    if (userNFT.owner && userNFT.owner !== userWallet.toString()) {
      throw new Error('ATOMIC SWAP FAILED: You do not own this NFT');
    }
    
    if (poolNFT.owner && poolNFT.owner !== pool.pool_address) {
      throw new Error('ATOMIC SWAP FAILED: Pool does not own the target NFT');
    }
    
    // Build ATOMIC transaction
    const transaction = new Transaction();
    
    // Load pool keypair
    let poolKeypair;
    try {
      const secretKeyArray = poolWalletData.secretKey.split(',').map(num => parseInt(num.trim()));
      
      if (secretKeyArray.length !== 64) {
        throw new Error(`Invalid secret key length: ${secretKeyArray.length}, expected 64`);
      }
      
      if (secretKeyArray.some(num => isNaN(num) || num < 0 || num > 255)) {
        throw new Error('Invalid secret key format: contains invalid numbers');
      }
      
      poolKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      
      if (poolKeypair.publicKey.toString() !== pool.pool_address) {
        throw new Error(`Pool keypair mismatch: expected ${pool.pool_address}, got ${poolKeypair.publicKey.toString()}`);
      }
      
    } catch (error) {
      throw new Error(`ATOMIC SWAP FAILED: Failed to load pool wallet: ${error.message}`);
    }
    
    // Calculate all required token accounts
    const userNFTAccount = await getAssociatedTokenAddress(
      new PublicKey(userNFTMint),
      userWallet
    );
    
    const poolNFTAccount = await getAssociatedTokenAddress(
      new PublicKey(poolNFTMint),
      new PublicKey(pool.pool_address)
    );
    
    const userReceiveAccount = await getAssociatedTokenAddress(
      new PublicKey(poolNFTMint),
      userWallet
    );
    
    const poolReceiveAccount = await getAssociatedTokenAddress(
      new PublicKey(userNFTMint),
      new PublicKey(pool.pool_address)
    );
    
    // Add fee payment instruction (FIRST)
    const swapFeeLamports = Math.floor(pool.swap_fee * LAMPORTS_PER_SOL);
    
    if (swapFeeLamports > 0) {
      const feeTransferInstruction = SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: feeCollectorAddress,
        lamports: swapFeeLamports,
      });
      
      transaction.add(feeTransferInstruction);
    }
    
    // Create associated token accounts if needed
    const userReceiveAccountInfo = await connection.getAccountInfo(userReceiveAccount);
    if (!userReceiveAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userWallet,
          userReceiveAccount,
          userWallet,
          new PublicKey(poolNFTMint)
        )
      );
    }
    
    const poolReceiveAccountInfo = await connection.getAccountInfo(poolReceiveAccount);
    if (!poolReceiveAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userWallet,
          poolReceiveAccount,
          new PublicKey(pool.pool_address),
          new PublicKey(userNFTMint)
        )
      );
    }
    
    // Add ATOMIC NFT transfer instructions
    transaction.add(
      createTransferInstruction(
        userNFTAccount,
        poolReceiveAccount,
        userWallet,
        1
      )
    );
    
    transaction.add(
      createTransferInstruction(
        poolNFTAccount,
        userReceiveAccount,
        new PublicKey(pool.pool_address),
        1
      )
    );
    
    // Prepare transaction for signing
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // DUAL SIGNING (Critical for atomic swap)
    transaction.partialSign(poolKeypair);
    
    if (!wallet.signTransaction) {
      throw new Error('ATOMIC SWAP FAILED: Wallet does not support transaction signing');
    }
    
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Broadcast atomic transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'finalized',
        maxRetries: 3,
      }
    );
    
    const explorerUrl = `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
    
    // Wait for finalized confirmation
    const finalizedConfirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'finalized'
    );
    
    if (finalizedConfirmation.value.err) {
      throw new Error('ATOMIC SWAP FAILED: Transaction failed: ' + JSON.stringify(finalizedConfirmation.value.err));
    }
    
    // Update pool statistics
    await updatePoolStats(collectionId, 0, pool.swap_fee);
    
    return {
      success: true,
      signature,
      explorerUrl,
      type: 'atomic_nft_swap',
      timestamp: new Date().toISOString(),
      fee: pool.swap_fee,
      feeCollector: feeCollectorAddress.toString(),
      userNFT: userNFTMint,
      poolNFT: poolNFTMint,
      collection: collectionId,
      network: networkInfo.network,
      confirmation: finalizedConfirmation,
      instructions: transaction.instructions.length,
      hasPoolAccess: true,
      feeVerified: true,
      atomicSwap: true,
      note: 'ATOMIC SWAP: Both NFTs and fee payment executed simultaneously in a single transaction with dual signatures',
    };
    
  } catch (error) {
    console.error('ATOMIC SWAP FAILED:', error);
    
    if (error.message.includes('insufficient funds')) {
      throw new Error('ATOMIC SWAP FAILED: Insufficient SOL balance for transaction fees and swap fee');
    } else if (error.message.includes('User rejected')) {
      throw new Error('ATOMIC SWAP FAILED: Transaction was rejected by user');
    } else if (error.message.includes('blockhash not found')) {
      throw new Error('ATOMIC SWAP FAILED: Network error - please try again');
    } else if (error.message.includes('ATOMIC SWAP FAILED')) {
      throw new Error(error.message);
    } else {
      throw new Error('ATOMIC SWAP FAILED: ' + error.message);
    }
  }
};

// Get real collection data with live stats
export const getCollectionData = async (collectionId: string) => {
  const pool = await getPool(collectionId);
  if (!pool) return null;

  try {
    const response = await fetch(
      `/api/magiceden/v2/collections/${pool.collection_symbol}/stats`
    );
    
    if (response.ok) {
      const stats = await response.json();
      return {
        ...pool,
        floorPrice: stats.floorPrice ? stats.floorPrice / LAMPORTS_PER_SOL : pool.swap_fee,
        listedCount: stats.listedCount || 0,
        volume24h: stats.volume24hr ? stats.volume24hr / LAMPORTS_PER_SOL : 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    return pool;
  } catch (error) {
    console.error('Error fetching collection stats:', error);
    return pool;
  }
};

// Utility functions
export const formatSOL = (lamports: number) => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
};

export const shortenAddress = (address: string, chars = 4) => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// Get explorer URL with correct format
export const getExplorerUrl = async (signature: string, userWallet?: string) => {
  const networkInfo = await getCurrentNetworkInfo(userWallet);
  return `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
};

// Validate if wallet has sufficient SOL for transaction
export const validateTransaction = async (userWallet: PublicKey, requiredSOL: number) => {
  try {
    const balance = await getUserBalance(userWallet);
    const totalRequired = requiredSOL + 0.002;
    
    return {
      valid: balance >= totalRequired,
      balance,
      required: totalRequired,
      swapFee: requiredSOL,
      buffer: 0.002,
      message: balance >= totalRequired 
        ? 'Sufficient balance for atomic swap and fees' 
        : `Insufficient balance. Need ${totalRequired.toFixed(4)} SOL total (${requiredSOL} swap fee + 0.002 buffer), have ${balance.toFixed(4)} SOL`,
    };
  } catch (error) {
    return {
      valid: false,
      balance: 0,
      required: requiredSOL,
      swapFee: requiredSOL,
      buffer: 0.002,
      message: 'Error checking balance',
    };
  }
};

// Check if pool address is valid Solana address
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Get pool NFT count
export const getPoolNFTCount = async (collectionId: string): Promise<number> => {
  try {
    const poolNFTs = await getPoolNFTs(collectionId);
    return poolNFTs.length;
  } catch (error) {
    console.error('Error getting pool NFT count:', error);
    return 0;
  }
};

// Test function to verify NFT by mint address
export const testNFTByMint = async (mintAddress: string, userWallet?: string) => {
  try {
    const nft = await searchNFTByMint(mintAddress, userWallet);
    return nft;
  } catch (error) {
    console.error('Error testing NFT:', error);
    return null;
  }
};

// Get current network information
export const getNetworkInfo = async (userWallet?: string) => {
  return await getCurrentNetworkInfo(userWallet);
};

// Validate fee collector address
export const validateFeeCollectorAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Get current fee collector address
export const getCurrentFeeCollector = async (userWallet?: string): Promise<string> => {
  try {
    if (userWallet) {
      const adminSettings = await getAdminSettings(userWallet);
      if (adminSettings?.fee_collector_wallet) {
        return adminSettings.fee_collector_wallet;
      }
    }
  } catch (error) {
    console.error('Error loading fee collector from Supabase:', error);
  }
  
  return 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
};

// Enhanced transaction verification
export const verifyTransaction = async (signature: string, userWallet?: string) => {
  try {
    const connection = await getConnection();
    const networkInfo = await getCurrentNetworkInfo(userWallet);
    
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
    
    if (!txDetails) {
      throw new Error('Transaction not found on blockchain');
    }
    
    if (txDetails.meta?.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(txDetails.meta.err));
    }
    
    return {
      exists: true,
      success: true,
      signature,
      blockTime: txDetails.blockTime,
      slot: txDetails.slot,
      fee: txDetails.meta?.fee,
      explorerUrl: `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`,
      details: txDetails,
    };
    
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return {
      exists: false,
      success: false,
      signature,
      error: error.message,
    };
  }
};