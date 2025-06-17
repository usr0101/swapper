import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftSwap } from "../target/types/nft_swap";
import { expect } from "chai";

describe("nft-swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.nftSwap as Program<NftSwap>;
  const provider = anchor.getProvider();

  it("Initializes a pool", async () => {
    const collectionId = "test-collection";
    const swapFee = new anchor.BN(50000000); // 0.05 SOL

    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(collectionId)],
      program.programId
    );

    try {
      const tx = await program.methods
        .initializePool(collectionId, swapFee)
        .accounts({
          pool: poolPda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Pool initialized with transaction signature:", tx);

      // Fetch the pool account
      const poolAccount = await program.account.pool.fetch(poolPda);
      expect(poolAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(poolAccount.collectionId).to.equal(collectionId);
      expect(poolAccount.swapFee.toString()).to.equal(swapFee.toString());
    } catch (error) {
      console.error("Error initializing pool:", error);
      throw error;
    }
  });

  it("Updates pool stats", async () => {
    const collectionId = "test-collection";
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(collectionId)],
      program.programId
    );

    const newNftCount = 10;
    const newVolume = new anchor.BN(1000000000); // 1 SOL

    try {
      const tx = await program.methods
        .updatePoolStats(newNftCount, newVolume)
        .accounts({
          pool: poolPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Pool stats updated with transaction signature:", tx);

      // Fetch the updated pool account
      const poolAccount = await program.account.pool.fetch(poolPda);
      expect(poolAccount.nftCount).to.equal(newNftCount);
      expect(poolAccount.totalVolume.toString()).to.equal(newVolume.toString());
    } catch (error) {
      console.error("Error updating pool stats:", error);
      throw error;
    }
  });

  it("Creates a swap order", async () => {
    const nftMint = anchor.web3.Keypair.generate().publicKey;
    const desiredTraits = ["rare", "blue"];

    const [swapOrderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("swap_order"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      const tx = await program.methods
        .createSwapOrder(nftMint, desiredTraits)
        .accounts({
          swapOrder: swapOrderPda,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Swap order created with transaction signature:", tx);

      // Fetch the swap order account
      const swapOrderAccount = await program.account.swapOrder.fetch(swapOrderPda);
      expect(swapOrderAccount.user.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(swapOrderAccount.nftMint.toString()).to.equal(nftMint.toString());
      expect(swapOrderAccount.desiredTraits).to.deep.equal(desiredTraits);
      expect(swapOrderAccount.isActive).to.be.true;
    } catch (error) {
      console.error("Error creating swap order:", error);
      throw error;
    }
  });
});