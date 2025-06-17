import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { getWalletNFTs, getWalletBalance, searchNFTByMint, heliusConnection } from './helius-api';
import { getAllPools, getPool, updatePoolStats, getPoolWalletData } from './pool-manager';

export const connection = heliusConnection;

// Get user NFTs for a specific collection
export const getUserNFTs = async (publicKey: PublicKey, collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) return [];
    
    const allNFTs = await getWalletNFTs(publicKey.toString());
    
    // Filter by collection
    return allNFTs.filter(nft => {
      if (pool.collection_address) {
        return nft.collection === pool.collection_address;
      }
      return nft.name?.toLowerCase().includes(pool.collection_name.toLowerCase());
    });
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    return [];
  }
};

// Get pool NFTs
export const getPoolNFTs = async (collectionId: string) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) return [];
    
    const poolNFTs = await getWalletNFTs(pool.pool_address);
    
    // Filter by collection
    return poolNFTs.filter(nft => {
      if (pool.collection_address) {
        return nft.collection === pool.collection_address;
      }
      return nft.name?.toLowerCase().includes(pool.collection_name.toLowerCase());
    });
  } catch (error) {
    console.error('Error fetching pool NFTs:', error);
    return [];
  }
};

// Get user balance
export const getUserBalance = async (publicKey: PublicKey) => {
  return await getWalletBalance(publicKey.toString());
};

// Execute atomic NFT swap
export const executeSwapTransaction = async (
  userWallet: PublicKey,
  userNFTMint: string,
  poolNFTMint: string,
  collectionId: string,
  wallet: any
) => {
  try {
    const pool = await getPool(collectionId);
    if (!pool) throw new Error('Pool not found');
    
    const poolWalletData = await getPoolWalletData(pool.pool_address);
    if (!poolWalletData?.secretKey) {
      throw new Error('Pool wallet access required for atomic swap');
    }
    
    // Validate NFTs
    const userNFT = await searchNFTByMint(userNFTMint);
    const poolNFT = await searchNFTByMint(poolNFTMint);
    
    if (!userNFT || !poolNFT) {
      throw new Error('NFT validation failed');
    }
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add fee payment
    const feeCollector = new PublicKey('J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M');
    const swapFeeLamports = Math.floor(pool.swap_fee * LAMPORTS_PER_SOL);
    
    if (swapFeeLamports > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: userWallet,
          toPubkey: feeCollector,
          lamports: swapFeeLamports,
        })
      );
    }
    
    // Add NFT transfers
    const userNFTAccount = await getAssociatedTokenAddress(new PublicKey(userNFTMint), userWallet);
    const poolNFTAccount = await getAssociatedTokenAddress(new PublicKey(poolNFTMint), new PublicKey(pool.pool_address));
    const userReceiveAccount = await getAssociatedTokenAddress(new PublicKey(poolNFTMint), userWallet);
    const poolReceiveAccount = await getAssociatedTokenAddress(new PublicKey(userNFTMint), new PublicKey(pool.pool_address));
    
    // Create accounts if needed
    try {
      await connection.getAccountInfo(userReceiveAccount);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userWallet,
          userReceiveAccount,
          userWallet,
          new PublicKey(poolNFTMint)
        )
      );
    }
    
    // Add transfers
    transaction.add(
      createTransferInstruction(userNFTAccount, poolReceiveAccount, userWallet, 1),
      createTransferInstruction(poolNFTAccount, userReceiveAccount, new PublicKey(pool.pool_address), 1)
    );
    
    // Sign and send
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // Pool signs first
    const poolKeypair = Keypair.fromSecretKey(
      new Uint8Array(poolWalletData.secretKey.split(',').map(n => parseInt(n)))
    );
    transaction.partialSign(poolKeypair);
    
    // User signs
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    await connection.confirmTransaction(signature);
    
    // Update stats
    await updatePoolStats(collectionId, 0, pool.swap_fee);
    
    return {
      success: true,
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      type: 'atomic_nft_swap',
    };
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
};

// Validate transaction
export const validateTransaction = async (userWallet: PublicKey, requiredSOL: number) => {
  const balance = await getUserBalance(userWallet);
  const totalRequired = requiredSOL + 0.002;
  
  return {
    valid: balance >= totalRequired,
    balance,
    required: totalRequired,
    swapFee: requiredSOL,
    buffer: 0.002,
    message: balance >= totalRequired 
      ? 'Sufficient balance' 
      : `Need ${totalRequired.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`,
  };
};

// Get collection data
export const getCollectionData = async (collectionId: string) => {
  return await getPool(collectionId);
};

// Get pool NFT count
export const getPoolNFTCount = async (collectionId: string) => {
  const poolNFTs = await getPoolNFTs(collectionId);
  return poolNFTs.length;
};