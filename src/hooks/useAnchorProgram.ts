import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import { getProgram, getPoolPDA } from '../lib/anchor';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export const useAnchorProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    return getProgram(wallet);
  }, [wallet]);

  const initializePool = async (collectionId: string, swapFee: number) => {
    if (!program || !wallet) throw new Error('Program or wallet not available');

    const [poolPDA] = getPoolPDA(collectionId);
    const swapFeeBN = new BN(swapFee * 1e9); // Convert SOL to lamports

    try {
      const tx = await program.methods
        .initializePool(collectionId, swapFeeBN)
        .accounts({
          pool: poolPDA,
          authority: wallet.publicKey,
        })
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error initializing pool:', error);
      return { success: false, error };
    }
  };

  const depositNft = async (collectionId: string, nftMint: PublicKey) => {
    if (!program || !wallet) throw new Error('Program or wallet not available');

    const [poolPDA] = getPoolPDA(collectionId);

    try {
      const tx = await program.methods
        .depositNft(nftMint)
        .accounts({
          pool: poolPDA,
          user: wallet.publicKey,
          nftMint: nftMint,
        })
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error depositing NFT:', error);
      return { success: false, error };
    }
  };

  const swapNft = async (
    collectionId: string,
    userNftMint: PublicKey,
    poolNftMint: PublicKey
  ) => {
    if (!program || !wallet) throw new Error('Program or wallet not available');

    const [poolPDA] = getPoolPDA(collectionId);

    try {
      const tx = await program.methods
        .swapNft(userNftMint, poolNftMint)
        .accounts({
          pool: poolPDA,
          user: wallet.publicKey,
          userNftMint: userNftMint,
          poolNftMint: poolNftMint,
        })
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error swapping NFT:', error);
      return { success: false, error };
    }
  };

  const getPoolData = async (collectionId: string) => {
    if (!program) throw new Error('Program not available');

    const [poolPDA] = getPoolPDA(collectionId);

    try {
      const poolData = await program.account.pool.fetch(poolPDA);
      return { success: true, data: poolData };
    } catch (error) {
      console.error('Error fetching pool data:', error);
      return { success: false, error };
    }
  };

  return {
    program,
    initializePool,
    depositNft,
    swapNft,
    getPoolData,
    isReady: !!program && !!wallet,
  };
};