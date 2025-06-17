import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getWalletNFTs, getWalletBalance, updateHeliusConnection, searchNFTByMint, getCurrentNetworkInfo } from './helius-api';
import { getAllPools, getPool, updatePoolStats, getPoolWalletData } from './pool-manager';
import { getAdminSettings } from './supabase';

export const getConnection = () => {
  return updateHeliusConnection();
};

export const connection = getConnection();

// FIXED: Get fee collector address from Supabase admin settings
const getFeeCollectorAddress = async (userWallet?: string) => {
  try {
    console.log('🔍 Loading fee collector from Supabase admin settings...');
    
    if (userWallet) {
      const adminSettings = await getAdminSettings(userWallet);
      
      if (adminSettings?.fee_collector_wallet) {
        console.log('Fee collector wallet from Supabase:', adminSettings.fee_collector_wallet);
        
        try {
          const pubkey = new PublicKey(adminSettings.fee_collector_wallet);
          console.log('✅ Using configured fee collector:', adminSettings.fee_collector_wallet);
          return pubkey;
        } catch (error) {
          console.error('❌ Invalid fee collector address format:', adminSettings.fee_collector_wallet, error);
        }
      } else {
        console.log('⚠️ No fee collector wallet configured in admin settings');
      }
    }
  } catch (error) {
    console.error('Error loading fee collector from Supabase:', error);
  }
  
  const defaultFeeCollector = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';
  console.log('⚠️ Using default fee collector:', defaultFeeCollector);
  return new PublicKey(defaultFeeCollector);
};

// Get REAL NFTs from user's wallet for a specific collection
export const getUserNFTs = async (publicKey: PublicKey, collectionId: string) => {
  try {
    console.log('Fetching REAL user NFTs for wallet:', publicKey.toString(), 'collection:', collectionId);
    
    const pool = await getPool(collectionId);
    if (!pool) {
      console.log('Pool not found for collection:', collectionId);
      return [];
    }
    
    const allNFTs = await getWalletNFTs(publicKey.toString(), publicKey.toString());
    console.log('Found total REAL NFTs in wallet:', allNFTs.length);
    
    if (allNFTs.length === 0) {
      console.log('No real NFTs found in wallet');
      return [];
    }
    
    let collectionNFTs = [];
    
    if (pool.collection_address && pool.collection_address !== '') {
      collectionNFTs = allNFTs.filter(nft => {
        return nft.collection === pool.collection_address ||
               nft.collection?.toLowerCase() === pool.collection_address.toLowerCase();
      });
      
      console.log('Real NFTs matching collection address:', collectionNFTs.length);
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
      
      console.log('Real NFTs matching by name/symbol:', collectionNFTs.length);
    }
    
    if (collectionNFTs.length === 0 && collectionId === 'swapper-collection') {
      console.log('SwapperCollection: showing all user NFTs for testing');
      collectionNFTs = allNFTs.slice(0, 10);
    }
    
    if (collectionNFTs.length === 0) {
      console.log('No real NFTs found matching collection criteria');
      return [];
    }
    
    console.log('Final filtered REAL NFTs:', collectionNFTs.length);
    return collectionNFTs;
    
  } catch (error) {
    console.error('Error fetching real user NFTs:', error);
    return [];
  }
};

// Get REAL pool NFTs
export const getPoolNFTs = async (collectionId: string) => {
  try {
    console.log('Fetching REAL pool NFTs for collection:', collectionId);
    
    const pool = await getPool(collectionId);
    if (!pool) {
      console.log('Pool not found for collection:', collectionId);
      return [];
    }
    
    console.log('Checking REAL pool address for NFTs:', pool.pool_address);
    
    if (!isValidSolanaAddress(pool.pool_address)) {
      console.log('Invalid pool address format:', pool.pool_address);
      return [];
    }
    
    const poolNFTs = await getWalletNFTs(pool.pool_address);
    console.log('Found REAL NFTs in pool address:', poolNFTs.length);
    
    if (poolNFTs.length === 0) {
      console.log('No real NFTs found in pool address - pool is empty');
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
    
    console.log('Filtered REAL pool NFTs for collection:', filteredPoolNFTs.length);
    return filteredPoolNFTs;
    
  } catch (error) {
    console.error('Error fetching real pool NFTs:', error);
    return [];
  }
};

// Get user's SOL balance using Helius
export const getUserBalance = async (publicKey: PublicKey) => {
  try {
    const balance = await getWalletBalance(publicKey.toString(), publicKey.toString());
    console.log('User balance:', balance, 'SOL');
    return balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

// ENHANCED: Atomic NFT swap with proper transaction structure
export const executeSwapTransaction = async (
  userWallet: PublicKey,
  userNFTMint: string,
  poolNFTMint: string,
  collectionId: string,
  wallet: any
) => {
  try {
    console.log('🔄 Starting ATOMIC NFT swap transaction...');
    console.log('User wallet:', userWallet.toString());
    console.log('User NFT mint:', userNFTMint);
    console.log('Pool NFT mint:', poolNFTMint);
    console.log('Collection:', collectionId);
    
    const pool = await getPool(collectionId);
    if (!pool) {
      throw new Error('Pool not found for collection');
    }
    
    console.log('Pool address:', pool.pool_address);
    console.log('Swap fee:', pool.swap_fee, 'SOL');
    
    const feeCollectorAddress = await getFeeCollectorAddress(userWallet.toString());
    console.log('💰 Fee collector address:', feeCollectorAddress.toString());
    
    const connection = await getConnection();
    
    // CRITICAL: Verify pool wallet access
    const poolWalletData = await getPoolWalletData(pool.pool_address);
    
    console.log('Pool wallet data found:', !!poolWalletData);
    console.log('Has secret key:', !!(poolWalletData && poolWalletData.secretKey));
    
    if (!poolWalletData || !poolWalletData.secretKey) {
      throw new Error('ATOMIC SWAP FAILED: Pool wallet private key not found. Both NFTs must be exchanged simultaneously, but the pool cannot authorize the transfer of its NFT. This requires both parties to sign the same transaction.');
    }
    
    console.log('✅ Pool wallet access confirmed - proceeding with ATOMIC swap');
    
    const networkInfo = await getCurrentNetworkInfo(userWallet.toString());
    console.log('Network:', networkInfo.network);
    
    // STEP 1: Validate both NFTs exist and are from same collection
    console.log('🔍 STEP 1: Validating NFTs and collection...');
    
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
    
    console.log('✅ Collection verification passed');
    
    // STEP 2: Verify ownership
    console.log('🔍 STEP 2: Verifying NFT ownership...');
    
    if (userNFT.owner && userNFT.owner !== userWallet.toString()) {
      throw new Error('ATOMIC SWAP FAILED: You do not own this NFT');
    }
    
    if (poolNFT.owner && poolNFT.owner !== pool.pool_address) {
      throw new Error('ATOMIC SWAP FAILED: Pool does not own the target NFT');
    }
    
    console.log('✅ Ownership verification passed');
    
    // STEP 3: Build ATOMIC transaction
    console.log('🔧 STEP 3: Building ATOMIC swap transaction...');
    
    const transaction = new Transaction();
    
    // Load pool keypair
    console.log('🔑 Loading pool keypair from stored secret key...');
    
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
      
      console.log('✅ Pool keypair loaded and verified successfully');
      
    } catch (error) {
      console.error('❌ Error loading pool keypair:', error);
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
    
    console.log('📋 Token accounts calculated');
    
    // STEP 4: Add fee payment instruction (FIRST)
    console.log('💰 STEP 4: Adding swap fee payment instruction...');
    
    const swapFeeLamports = Math.floor(pool.swap_fee * LAMPORTS_PER_SOL);
    
    if (swapFeeLamports > 0) {
      console.log('💸 Adding fee payment:', pool.swap_fee, 'SOL to', feeCollectorAddress.toString());
      
      const feeTransferInstruction = SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: feeCollectorAddress,
        lamports: swapFeeLamports,
      });
      
      transaction.add(feeTransferInstruction);
      console.log('✅ Fee payment instruction added as FIRST instruction');
    }
    
    // STEP 5: Create associated token accounts if needed
    console.log('🏗️ STEP 5: Creating token accounts if needed...');
    
    const userReceiveAccountInfo = await connection.getAccountInfo(userReceiveAccount);
    if (!userReceiveAccountInfo) {
      console.log('Creating user receive account for pool NFT');
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
      console.log('Creating pool receive account for user NFT');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userWallet,
          poolReceiveAccount,
          new PublicKey(pool.pool_address),
          new PublicKey(userNFTMint)
        )
      );
    }
    
    // STEP 6: Add ATOMIC NFT transfer instructions
    console.log('🔄 STEP 6: Adding ATOMIC NFT transfer instructions...');
    
    // Transfer 1: User's NFT to pool (user signs)
    transaction.add(
      createTransferInstruction(
        userNFTAccount,
        poolReceiveAccount,
        userWallet,
        1
      )
    );
    
    // Transfer 2: Pool's NFT to user (pool signs)
    transaction.add(
      createTransferInstruction(
        poolNFTAccount,
        userReceiveAccount,
        new PublicKey(pool.pool_address),
        1
      )
    );
    
    console.log('✅ ATOMIC swap configured - both NFTs will be exchanged simultaneously');
    
    // STEP 7: Prepare transaction for signing
    console.log('📝 STEP 7: Preparing ATOMIC transaction for dual signing...');
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    console.log('Transaction prepared with', transaction.instructions.length, 'instructions:');
    transaction.instructions.forEach((instruction, index) => {
      const programName = instruction.programId.equals(SystemProgram.programId) ? 'System Program (Fee Payment)' :
                         instruction.programId.equals(TOKEN_PROGRAM_ID) ? 'Token Program (NFT Transfer)' :
                         instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) ? 'Associated Token Program' :
                         instruction.programId.toString();
      console.log(`  ${index + 1}. ${programName}`);
    });
    
    // STEP 8: DUAL SIGNING (Critical for atomic swap)
    console.log('✍️ STEP 8: DUAL SIGNING for atomic execution...');
    
    // First, pool signs its part
    transaction.partialSign(poolKeypair);
    console.log('✅ Pool signed the transaction');
    
    // Then user signs
    if (!wallet.signTransaction) {
      throw new Error('ATOMIC SWAP FAILED: Wallet does not support transaction signing');
    }
    
    const signedTransaction = await wallet.signTransaction(transaction);
    console.log('✅ User signed the transaction');
    console.log('🔒 ATOMIC transaction fully signed by both parties');
    
    // STEP 9: Broadcast atomic transaction
    console.log('📡 STEP 9: Broadcasting ATOMIC transaction...');
    
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'finalized',
        maxRetries: 3,
      }
    );
    
    console.log('🚀 ATOMIC transaction sent with signature:', signature);
    
    // FIXED: Correct explorer URL format
    const explorerUrl = `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
    console.log('🔗 Explorer URL:', explorerUrl);
    
    // STEP 10: Wait for finalized confirmation
    console.log('⏳ STEP 10: Waiting for ATOMIC transaction confirmation...');
    
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
    
    console.log('✅ ATOMIC transaction finalized successfully');
    
    // STEP 11: Update pool statistics
    console.log('📊 STEP 11: Updating pool statistics...');
    await updatePoolStats(collectionId, 0, pool.swap_fee);
    
    console.log('🎉 ATOMIC SWAP COMPLETED SUCCESSFULLY!');
    console.log('🎉 Both NFTs have been exchanged simultaneously in a single atomic transaction');
    console.log('💰 Fee payment processed atomically to:', feeCollectorAddress.toString());
    
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
    console.error('❌ ATOMIC SWAP FAILED:', error);
    
    if (error.message.includes('insufficient funds')) {
      throw new Error('ATOMIC SWAP FAILED: Insufficient SOL balance for transaction fees and swap fee');
    } else if (error.message.includes('User rejected')) {
      throw new Error('ATOMIC SWAP FAILED: Transaction was rejected by user');
    } else if (error.message.includes('blockhash not found')) {
      throw new Error('ATOMIC SWAP FAILED: Network error - please try again');
    } else if (error.message.includes('ATOMIC SWAP FAILED')) {
      throw new Error(error.message); // Pass through our custom atomic swap errors
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

// FIXED: Get explorer URL with correct format
export const getExplorerUrl = async (signature: string, userWallet?: string) => {
  const networkInfo = await getCurrentNetworkInfo(userWallet);
  return `${networkInfo.explorerUrl}/tx/${signature}?cluster=${networkInfo.network}`;
};

// Validate if wallet has sufficient SOL for transaction
export const validateTransaction = async (userWallet: PublicKey, requiredSOL: number) => {
  try {
    const balance = await getUserBalance(userWallet);
    const totalRequired = requiredSOL + 0.002;
    
    console.log('💰 Balance validation:');
    console.log('  Current balance:', balance, 'SOL');
    console.log('  Required (swap fee):', requiredSOL, 'SOL');
    console.log('  Total required (with buffer):', totalRequired, 'SOL');
    
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
    console.log('Testing NFT mint:', mintAddress);
    const nft = await searchNFTByMint(mintAddress, userWallet);
    console.log('NFT found:', nft);
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
    
    console.log('🔍 Verifying transaction:', signature);
    
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
    
    if (!txDetails) {
      throw new Error('Transaction not found on blockchain');
    }
    
    console.log('✅ Transaction found on blockchain');
    console.log('Block time:', new Date(txDetails.blockTime! * 1000).toISOString());
    console.log('Slot:', txDetails.slot);
    console.log('Fee paid:', txDetails.meta?.fee, 'lamports');
    
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