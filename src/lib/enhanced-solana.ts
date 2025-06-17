// Enhanced Solana integration with security improvements

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { getWalletNFTs, getWalletBalance, updateHeliusConnection, searchNFTByMint, getCurrentNetworkInfo } from './helius-api';
import { getAllPools, getPool, updatePoolStats, getPoolWalletData } from './pool-manager';
import { getAdminSettings } from './supabase';
import { validateTransactionParams, SecurityError, auditLog } from './security';
import { logFailedTransaction, securityMonitor } from './monitoring';

export const getConnection = () => {
  return updateHeliusConnection();
};

export const connection = getConnection();

// Enhanced fee collector with validation
const getFeeCollectorAddress = async (userWallet?: string) => {
  try {
    if (userWallet) {
      const adminSettings = await getAdminSettings(userWallet);
      
      if (adminSettings?.fee_collector_wallet) {
        try {
          const pubkey = new PublicKey(adminSettings.fee_collector_wallet);
          
          // SECURITY FIX: Validate fee collector is not a program account
          const accountInfo = await connection.getAccountInfo(pubkey);
          if (accountInfo?.executable) {
            throw new SecurityError('Fee collector cannot be a program account', 'INVALID_FEE_COLLECTOR');
          }
          
          return pubkey;
        } catch (error) {
          console.error('Invalid fee collector address format:', adminSettings.fee_collector_wallet, error);
          auditLog('INVALID_FEE_COLLECTOR', { address: adminSettings.fee_collector_wallet, error: error.message });
        }
      }
    }
  } catch (error) {
    console.error('Error loading fee collector from Supabase:', error);
  }
  
  const defaultFeeCollector = import.meta.env.VITE_ADMIN_WALLET || 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  return new PublicKey(defaultFeeCollector);
};

// Enhanced NFT fetching with security validation
export const getUserNFTs = async (publicKey: PublicKey, collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) {
      return [];
    }
    
    // SECURITY FIX: Rate limiting for NFT fetching
    const rateLimitKey = `getUserNFTs_${publicKey.toString()}`;
    if (!securityMonitor['rateLimiter']?.isAllowed(rateLimitKey, 10, 60000)) {
      throw new SecurityError('Rate limit exceeded for NFT fetching', 'RATE_LIMIT_EXCEEDED');
    }
    
    const allNFTs = await getWalletNFTs(publicKey.toString(), publicKey.toString());
    
    if (allNFTs.length === 0) {
      return [];
    }
    
    // Enhanced collection filtering with validation
    let collectionNFTs = [];
    
    if (pool.collection_address && pool.collection_address !== '') {
      collectionNFTs = allNFTs.filter(nft => {
        // SECURITY FIX: Validate NFT collection address
        if (!nft.collection || typeof nft.collection !== 'string') {
          return false;
        }
        
        return nft.collection === pool.collection_address ||
               nft.collection?.toLowerCase() === pool.collection_address.toLowerCase();
      });
    }
    
    // Fallback to name-based filtering with sanitization
    if (collectionNFTs.length === 0) {
      collectionNFTs = allNFTs.filter(nft => {
        const nftName = (nft.name?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const nftSymbol = (nft.symbol?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const poolName = (pool.collection_name?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const poolSymbol = (pool.collection_symbol?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        
        return nftName.includes(poolName.split(' ')[0]) ||
               nftSymbol.includes(poolSymbol) ||
               nftName.includes(poolSymbol);
      });
    }
    
    // SECURITY FIX: Validate NFT metadata
    return collectionNFTs.filter(nft => {
      return nft.mint && 
             typeof nft.mint === 'string' && 
             nft.mint.length >= 32 &&
             nft.name &&
             typeof nft.name === 'string';
    });
    
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    logFailedTransaction(error, { action: 'getUserNFTs', publicKey: publicKey.toString(), collectionId });
    return [];
  }
};

// Enhanced pool NFT fetching
export const getPoolNFTs = async (collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) {
      return [];
    }
    
    // SECURITY FIX: Validate pool address format
    if (!isValidSolanaAddress(pool.pool_address)) {
      throw new SecurityError('Invalid pool address format', 'INVALID_POOL_ADDRESS');
    }
    
    const poolNFTs = await getWalletNFTs(pool.pool_address);
    
    if (poolNFTs.length === 0) {
      return [];
    }
    
    // Enhanced filtering with validation
    let filteredPoolNFTs = [];
    
    if (pool.collection_address && pool.collection_address !== '') {
      filteredPoolNFTs = poolNFTs.filter(nft => {
        return nft.collection === pool.collection_address ||
               nft.collection?.toLowerCase() === pool.collection_address.toLowerCase();
      });
    } else {
      filteredPoolNFTs = poolNFTs.filter(nft => {
        const nftName = (nft.name?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const nftSymbol = (nft.symbol?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const poolName = (pool.collection_name?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        const poolSymbol = (pool.collection_symbol?.toLowerCase() || '').replace(/[<>\"'&]/g, '');
        
        return nftName.includes(poolName.split(' ')[0]) ||
               nftSymbol.includes(poolSymbol) ||
               nftName.includes(poolSymbol);
      });
    }
    
    return filteredPoolNFTs.filter(nft => {
      return nft.mint && 
             typeof nft.mint === 'string' && 
             nft.mint.length >= 32;
    });
    
  } catch (error) {
    console.error('Error fetching pool NFTs:', error);
    logFailedTransaction(error, { action: 'getPoolNFTs', collectionId });
    return [];
  }
};

// Enhanced balance fetching
export const getUserBalance = async (publicKey: PublicKey) => {
  try {
    const balance = await getWalletBalance(publicKey.toString(), publicKey.toString());
    
    // SECURITY FIX: Validate balance is reasonable
    if (balance < 0 || balance > 1000000) {
      auditLog('SUSPICIOUS_BALANCE', { publicKey: publicKey.toString(), balance });
    }
    
    return balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

// Enhanced atomic NFT swap with comprehensive security
export const executeSwapTransaction = async (
  userWallet: PublicKey,
  userNFTMint: string,
  poolNFTMint: string,
  collectionId: string,
  wallet: any
) => {
  try {
    // SECURITY FIX: Comprehensive input validation
    validateTransactionParams({
      userNFTMint,
      poolNFTMint,
      swapFee: 0, // Will be validated later
      userWallet: userWallet.toString(),
    });
    
    const pool = await getPool(collectionId);
    if (!pool) {
      throw new SecurityError('Pool not found for collection', 'POOL_NOT_FOUND');
    }
    
    // SECURITY FIX: Validate swap fee
    if (!pool.swap_fee || pool.swap_fee < 0 || pool.swap_fee > 10) {
      throw new SecurityError('Invalid swap fee configuration', 'INVALID_SWAP_FEE');
    }
    
    const feeCollectorAddress = await getFeeCollectorAddress(userWallet.toString());
    const connection = await getConnection();
    
    // Verify pool wallet access with enhanced security
    const poolWalletData = await getPoolWalletData(pool.pool_address);
    
    if (!poolWalletData || !poolWalletData.secretKey) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Pool wallet private key not found. Both NFTs must be exchanged simultaneously, but the pool cannot authorize the transfer of its NFT. This requires both parties to sign the same transaction.',
        'POOL_WALLET_ACCESS_DENIED'
      );
    }
    
    const networkInfo = await getCurrentNetworkInfo(userWallet.toString());
    
    // Enhanced NFT validation
    const userNFT = await searchNFTByMint(userNFTMint, userWallet.toString());
    const poolNFT = await searchNFTByMint(poolNFTMint, userWallet.toString());
    
    if (!userNFT) {
      throw new SecurityError('User NFT not found or invalid', 'USER_NFT_NOT_FOUND');
    }
    
    if (!poolNFT) {
      throw new SecurityError('Pool NFT not found or invalid', 'POOL_NFT_NOT_FOUND');
    }
    
    // SECURITY FIX: Enhanced collection verification
    const userCollection = userNFT.collection || '';
    const poolCollection = poolNFT.collection || '';
    
    if (pool.collection_address && pool.collection_address !== '') {
      if (userCollection !== pool.collection_address || poolCollection !== pool.collection_address) {
        throw new SecurityError(
          'ATOMIC SWAP FAILED: Both NFTs must be from the same verified collection',
          'COLLECTION_MISMATCH'
        );
      }
    } else {
      if (userCollection !== poolCollection && userCollection !== '' && poolCollection !== '') {
        throw new SecurityError(
          'ATOMIC SWAP FAILED: Both NFTs must be from the same collection',
          'COLLECTION_MISMATCH'
        );
      }
    }
    
    // SECURITY FIX: Enhanced ownership verification
    if (userNFT.owner && userNFT.owner !== userWallet.toString()) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: You do not own this NFT',
        'OWNERSHIP_VERIFICATION_FAILED'
      );
    }
    
    if (poolNFT.owner && poolNFT.owner !== pool.pool_address) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Pool does not own the target NFT',
        'POOL_OWNERSHIP_VERIFICATION_FAILED'
      );
    }
    
    // Build ATOMIC transaction with enhanced security
    const transaction = new Transaction();
    
    // SECURITY FIX: Enhanced pool keypair validation
    let poolKeypair;
    try {
      const secretKeyArray = poolWalletData.secretKey.split(',').map(num => parseInt(num.trim()));
      
      if (secretKeyArray.length !== 64) {
        throw new SecurityError(
          `Invalid secret key length: ${secretKeyArray.length}, expected 64`,
          'INVALID_SECRET_KEY_LENGTH'
        );
      }
      
      if (secretKeyArray.some(num => isNaN(num) || num < 0 || num > 255)) {
        throw new SecurityError(
          'Invalid secret key format: contains invalid numbers',
          'INVALID_SECRET_KEY_FORMAT'
        );
      }
      
      poolKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      
      if (poolKeypair.publicKey.toString() !== pool.pool_address) {
        throw new SecurityError(
          `Pool keypair mismatch: expected ${pool.pool_address}, got ${poolKeypair.publicKey.toString()}`,
          'POOL_KEYPAIR_MISMATCH'
        );
      }
      
    } catch (error) {
      if (error instanceof SecurityError) throw error;
      throw new SecurityError(
        `ATOMIC SWAP FAILED: Failed to load pool wallet: ${error.message}`,
        'POOL_WALLET_LOAD_FAILED'
      );
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
    
    // SECURITY FIX: Validate fee amount with overflow protection
    const swapFeeLamports = Math.floor(pool.swap_fee * LAMPORTS_PER_SOL);
    
    if (swapFeeLamports < 0 || swapFeeLamports > 10 * LAMPORTS_PER_SOL) {
      throw new SecurityError(
        'Invalid swap fee calculation',
        'INVALID_FEE_CALCULATION'
      );
    }
    
    // Add fee payment instruction (FIRST)
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
    
    // SECURITY FIX: Enhanced transaction preparation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // SECURITY FIX: Validate transaction size
    const serializedSize = transaction.serialize({ requireAllSignatures: false }).length;
    if (serializedSize > 1232) { // Solana transaction size limit
      throw new SecurityError(
        'Transaction too large',
        'TRANSACTION_SIZE_EXCEEDED'
      );
    }
    
    // DUAL SIGNING (Critical for atomic swap)
    transaction.partialSign(poolKeypair);
    
    if (!wallet.signTransaction) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Wallet does not support transaction signing',
        'WALLET_SIGNING_NOT_SUPPORTED'
      );
    }
    
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // SECURITY FIX: Enhanced transaction broadcasting
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'finalized',
        maxRetries: 3,
      }
    );
    
    const explorerUrl = `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
    
    // Wait for finalized confirmation with timeout
    const confirmationPromise = connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'finalized'
    );
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000);
    });
    
    const finalizedConfirmation = await Promise.race([confirmationPromise, timeoutPromise]);
    
    if (finalizedConfirmation.value.err) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Transaction failed: ' + JSON.stringify(finalizedConfirmation.value.err),
        'TRANSACTION_EXECUTION_FAILED'
      );
    }
    
    // Update pool statistics with overflow protection
    await updatePoolStats(collectionId, 0, pool.swap_fee);
    
    // SECURITY FIX: Audit log successful swap
    auditLog('SUCCESSFUL_SWAP', {
      signature,
      userWallet: userWallet.toString(),
      userNFT: userNFTMint,
      poolNFT: poolNFTMint,
      swapFee: pool.swap_fee,
      collectionId,
      network: networkInfo.network,
    });
    
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
      securityValidated: true,
      note: 'ATOMIC SWAP: Both NFTs and fee payment executed simultaneously in a single transaction with dual signatures and comprehensive security validation',
    };
    
  } catch (error) {
    console.error('ATOMIC SWAP FAILED:', error);
    
    // Enhanced error logging
    logFailedTransaction(error, {
      action: 'executeSwapTransaction',
      userWallet: userWallet.toString(),
      userNFTMint,
      poolNFTMint,
      collectionId,
    });
    
    // Enhanced error handling
    if (error instanceof SecurityError) {
      throw error;
    } else if (error.message.includes('insufficient funds')) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Insufficient SOL balance for transaction fees and swap fee',
        'INSUFFICIENT_FUNDS'
      );
    } else if (error.message.includes('User rejected')) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Transaction was rejected by user',
        'USER_REJECTED_TRANSACTION'
      );
    } else if (error.message.includes('blockhash not found')) {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: Network error - please try again',
        'NETWORK_ERROR'
      );
    } else {
      throw new SecurityError(
        'ATOMIC SWAP FAILED: ' + error.message,
        'UNKNOWN_ERROR'
      );
    }
  }
};

// Enhanced validation with security checks
export const validateTransaction = async (userWallet: PublicKey, requiredSOL: number) => {
  try {
    // SECURITY FIX: Validate input parameters
    if (requiredSOL < 0 || requiredSOL > 100) {
      throw new SecurityError('Invalid required SOL amount', 'INVALID_REQUIRED_SOL');
    }
    
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
    logFailedTransaction(error, { action: 'validateTransaction', userWallet: userWallet.toString() });
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

// Utility functions with security enhancements
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    if (!address || typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;
    
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Additional utility functions remain the same but with enhanced error handling
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

export const formatSOL = (lamports: number) => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
};

export const shortenAddress = (address: string, chars = 4) => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const getExplorerUrl = async (signature: string, userWallet?: string) => {
  const networkInfo = await getCurrentNetworkInfo(userWallet);
  return `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
};

export const getPoolNFTCount = async (collectionId: string): Promise<number> => {
  try {
    const poolNFTs = await getPoolNFTs(collectionId);
    return poolNFTs.length;
  } catch (error) {
    console.error('Error getting pool NFT count:', error);
    return 0;
  }
};

export const testNFTByMint = async (mintAddress: string, userWallet?: string) => {
  try {
    const nft = await searchNFTByMint(mintAddress, userWallet);
    return nft;
  } catch (error) {
    console.error('Error testing NFT:', error);
    return null;
  }
};

export const getNetworkInfo = async (userWallet?: string) => {
  return await getCurrentNetworkInfo(userWallet);
};

export const validateFeeCollectorAddress = (address: string): boolean => {
  return isValidSolanaAddress(address);
};

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
  
  return import.meta.env.VITE_ADMIN_WALLET || 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
};

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