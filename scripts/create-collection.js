const { Connection, Keypair, PublicKey, clusterApiUrl, Transaction, SystemProgram } = require('@solana/web3.js');
const { 
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} = require('@metaplex-foundation/mpl-token-metadata');
const {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  transfer,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Connection to devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Admin wallet to receive 2 NFTs
const ADMIN_WALLET = 'J1Fmahkhu93MFojv3Ycq31baKCkZ7ctVLq8zm3gFF3M';

// Collection metadata
const COLLECTION_NAME = "SwapperCollection";
const COLLECTION_SYMBOL = "SWAP";
const COLLECTION_DESCRIPTION = "A collection of 10 unique NFTs created for the Swapper platform on Solana devnet";

// Random collection image
const COLLECTION_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1635776062043-223faf322554?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=400&fit=crop&crop=center"
];

// NFT images
const NFT_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1635776062043-223faf322554?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1635776062043-223faf322554?w=400&h=400&fit=crop&crop=center&sat=50"
];

// Random attributes
const COLORS = ['Blue', 'Red', 'Green', 'Purple', 'Gold', 'Silver', 'Orange', 'Pink', 'Black', 'Rainbow'];
const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary'];
const BACKGROUNDS = ['Cosmic', 'Fire', 'Forest', 'Galaxy', 'Temple', 'Metal', 'Desert', 'Clouds', 'Shadow', 'Prism'];
const EYES = ['Glowing', 'Normal', 'Sharp', 'Mystic', 'Divine', 'Robotic', 'Warm', 'Dreamy', 'Dark', 'Spectrum'];
const ACCESSORIES = ['Crown', 'None', 'Sword', 'Staff', 'Halo', 'Armor', 'Hat', 'Wings', 'Cloak', 'Crystal'];

// Function to get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to generate random NFT metadata
function generateNFTMetadata(index) {
  return {
    name: `Swapper #${(index + 1).toString().padStart(3, '0')}`,
    description: `The ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : `${index + 1}th`} NFT in the SwapperCollection`,
    image: NFT_IMAGES[index],
    attributes: [
      { trait_type: "Color", value: getRandomElement(COLORS) },
      { trait_type: "Rarity", value: getRandomElement(RARITIES) },
      { trait_type: "Background", value: getRandomElement(BACKGROUNDS) },
      { trait_type: "Eyes", value: getRandomElement(EYES) },
      { trait_type: "Accessory", value: getRandomElement(ACCESSORIES) }
    ]
  };
}

// Function to create collection
async function createSwapperCollection() {
  console.log('🚀 Creating SwapperCollection on Solana Devnet...');
  
  try {
    // Load or create wallet
    let wallet;
    const walletPath = path.join(__dirname, '../.swapper-wallet.json');
    
    if (fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
      console.log('📁 Loaded existing wallet:', wallet.publicKey.toString());
    } else {
      wallet = Keypair.generate();
      fs.writeFileSync(walletPath, JSON.stringify(Array.from(wallet.secretKey)));
      console.log('🆕 Created new wallet:', wallet.publicKey.toString());
      console.log('💰 Please fund this wallet with devnet SOL from https://faucet.solana.com/');
      
      // Request airdrop
      console.log('🪂 Requesting airdrop...');
      try {
        const airdropSignature = await connection.requestAirdrop(wallet.publicKey, 2 * 1e9);
        await connection.confirmTransaction(airdropSignature);
        console.log('✅ Airdrop completed');
      } catch (airdropError) {
        console.log('⚠️ Airdrop failed, please manually fund the wallet');
      }
    }

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.5 * 1e9) {
      console.log('❌ Insufficient balance. Please fund the wallet with devnet SOL');
      console.log('🔗 Get devnet SOL: https://faucet.solana.com/');
      console.log(`📋 Wallet address: ${wallet.publicKey.toString()}`);
      return;
    }

    // Random collection image
    const randomCollectionImage = getRandomElement(COLLECTION_IMAGES);
    
    const collectionData = {
      name: COLLECTION_NAME,
      symbol: COLLECTION_SYMBOL,
      description: COLLECTION_DESCRIPTION,
      image: randomCollectionImage,
      external_url: "https://swapper.dev",
      attributes: [],
      properties: {
        files: [
          {
            uri: randomCollectionImage,
            type: "image/jpeg"
          }
        ],
        category: "image"
      }
    };

    // Create collection mint
    console.log('🏗️ Creating collection mint...');
    const collectionMint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      0
    );
    console.log('✅ Collection mint created:', collectionMint.toString());

    // Create collection token account
    const collectionTokenAccount = await createAssociatedTokenAccount(
      connection,
      wallet,
      collectionMint,
      wallet.publicKey
    );

    // Mint collection token
    await mintTo(
      connection,
      wallet,
      collectionMint,
      collectionTokenAccount,
      wallet.publicKey,
      1
    );

    // Create metadata for collection
    const [collectionMetadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const collectionMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: collectionMetadataPDA,
        mint: collectionMint,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        updateAuthority: wallet.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: collectionData.name,
            symbol: collectionData.symbol,
            uri: `data:application/json;base64,${Buffer.from(JSON.stringify(collectionData)).toString('base64')}`,
            sellerFeeBasisPoints: 500,
            creators: [
              {
                address: wallet.publicKey,
                verified: true,
                share: 100,
              },
            ],
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: { __kind: 'V1', size: 10 },
        },
      }
    );

    // Create master edition for collection
    const [collectionMasterEditionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const collectionMasterEditionInstruction = createCreateMasterEditionV3Instruction(
      {
        edition: collectionMasterEditionPDA,
        mint: collectionMint,
        updateAuthority: wallet.publicKey,
        mintAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        metadata: collectionMetadataPDA,
      },
      {
        createMasterEditionArgs: {
          maxSupply: 0,
        },
      }
    );

    // Send collection creation transaction
    const collectionTransaction = new Transaction().add(
      collectionMetadataInstruction,
      collectionMasterEditionInstruction
    );

    const collectionSignature = await connection.sendTransaction(collectionTransaction, [wallet]);
    await connection.confirmTransaction(collectionSignature);
    console.log('✅ Collection created with signature:', collectionSignature);

    // Create individual NFTs
    const nftMints = [];
    const adminNFTs = []; // Track NFTs to send to admin
    
    for (let i = 0; i < 10; i++) {
      const nftData = generateNFTMetadata(i);
      console.log(`🎨 Creating NFT ${i + 1}/10: ${nftData.name}...`);

      // Create NFT mint
      const nftMint = await createMint(
        connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
      );

      // Create NFT token account
      const nftTokenAccount = await createAssociatedTokenAccount(
        connection,
        wallet,
        nftMint,
        wallet.publicKey
      );

      // Mint NFT token
      await mintTo(
        connection,
        wallet,
        nftMint,
        nftTokenAccount,
        wallet.publicKey,
        1
      );

      // Create metadata for NFT
      const [nftMetadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const nftMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
          metadata: nftMetadataPDA,
          mint: nftMint,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: nftData.name,
              symbol: COLLECTION_SYMBOL,
              uri: `data:application/json;base64,${Buffer.from(JSON.stringify(nftData)).toString('base64')}`,
              sellerFeeBasisPoints: 500,
              creators: [
                {
                  address: wallet.publicKey,
                  verified: true,
                  share: 100,
                },
              ],
              collection: {
                verified: false,
                key: collectionMint,
              },
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      );

      // Create master edition for NFT
      const [nftMasterEditionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const nftMasterEditionInstruction = createCreateMasterEditionV3Instruction(
        {
          edition: nftMasterEditionPDA,
          mint: nftMint,
          updateAuthority: wallet.publicKey,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          metadata: nftMetadataPDA,
        },
        {
          createMasterEditionArgs: {
            maxSupply: 1,
          },
        }
      );

      // Send NFT creation transaction
      const nftTransaction = new Transaction().add(
        nftMetadataInstruction,
        nftMasterEditionInstruction
      );

      const nftSignature = await connection.sendTransaction(nftTransaction, [wallet]);
      await connection.confirmTransaction(nftSignature);

      const nftInfo = {
        mint: nftMint.toString(),
        name: nftData.name,
        signature: nftSignature,
        metadata: nftData,
        tokenAccount: nftTokenAccount.toString()
      };

      nftMints.push(nftInfo);

      // Mark first 2 NFTs for admin transfer
      if (i < 2) {
        adminNFTs.push(nftInfo);
      }

      console.log(`✅ NFT ${i + 1} created: ${nftMint.toString()}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Transfer 2 NFTs to admin wallet
    console.log(`\n🎁 Transferring 2 NFTs to admin wallet: ${ADMIN_WALLET}`);
    
    for (let i = 0; i < adminNFTs.length; i++) {
      const nft = adminNFTs[i];
      console.log(`📤 Transferring ${nft.name} to admin...`);

      try {
        // Create admin's associated token account
        const adminTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(nft.mint),
          new PublicKey(ADMIN_WALLET)
        );

        // Check if admin token account exists, create if not
        try {
          await connection.getAccountInfo(adminTokenAccount);
        } catch {
          // Create the account
          await createAssociatedTokenAccount(
            connection,
            wallet,
            new PublicKey(nft.mint),
            new PublicKey(ADMIN_WALLET)
          );
        }

        // Transfer the NFT
        const transferSignature = await transfer(
          connection,
          wallet,
          new PublicKey(nft.tokenAccount),
          adminTokenAccount,
          wallet.publicKey,
          1
        );

        await connection.confirmTransaction(transferSignature);
        console.log(`✅ ${nft.name} transferred to admin: ${transferSignature}`);
        
        // Update NFT info
        nft.transferredToAdmin = true;
        nft.adminTokenAccount = adminTokenAccount.toString();
        nft.transferSignature = transferSignature;

      } catch (transferError) {
        console.log(`⚠️ Failed to transfer ${nft.name} to admin:`, transferError.message);
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save collection data
    const collectionInfo = {
      collectionMint: collectionMint.toString(),
      collectionName: COLLECTION_NAME,
      collectionSymbol: COLLECTION_SYMBOL,
      collectionImage: randomCollectionImage,
      creator: wallet.publicKey.toString(),
      adminWallet: ADMIN_WALLET,
      network: 'devnet',
      createdAt: new Date().toISOString(),
      nfts: nftMints,
      totalSupply: 10,
      adminNFTCount: adminNFTs.filter(nft => nft.transferredToAdmin).length,
      explorerUrl: `https://explorer.solana.com/address/${collectionMint.toString()}?cluster=devnet`
    };

    fs.writeFileSync(
      path.join(__dirname, '../swapper-collection.json'),
      JSON.stringify(collectionInfo, null, 2)
    );

    console.log('\n🎉 SwapperCollection Created Successfully!');
    console.log('=====================================');
    console.log(`📦 Collection Mint: ${collectionMint.toString()}`);
    console.log(`🖼️ Collection Image: ${randomCollectionImage}`);
    console.log(`👤 Creator: ${wallet.publicKey.toString()}`);
    console.log(`👑 Admin Wallet: ${ADMIN_WALLET}`);
    console.log(`🔢 Total NFTs: ${nftMints.length}`);
    console.log(`🎁 NFTs sent to admin: ${adminNFTs.filter(nft => nft.transferredToAdmin).length}`);
    console.log(`🌐 Network: Solana Devnet`);
    console.log(`🔗 Explorer: https://explorer.solana.com/address/${collectionMint.toString()}?cluster=devnet`);
    
    console.log('\n📋 All NFTs:');
    nftMints.forEach((nft, index) => {
      const owner = nft.transferredToAdmin ? 'Admin' : 'Creator';
      const rarity = nft.metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Unknown';
      const color = nft.metadata.attributes.find(attr => attr.trait_type === 'Color')?.value || 'Unknown';
      console.log(`  ${index + 1}. ${nft.name} (${color}, ${rarity}) - Owner: ${owner}`);
    });
    
    console.log('\n🎁 Admin NFTs:');
    adminNFTs.forEach((nft, index) => {
      if (nft.transferredToAdmin) {
        console.log(`  ✅ ${nft.name}: ${nft.mint}`);
      } else {
        console.log(`  ❌ ${nft.name}: Transfer failed`);
      }
    });
    
    console.log('\n💾 Collection data saved to: swapper-collection.json');
    console.log('🔑 Wallet data saved to: .swapper-wallet.json');
    console.log('\n🔗 Useful Links:');
    console.log(`   Collection: https://explorer.solana.com/address/${collectionMint.toString()}?cluster=devnet`);
    console.log(`   Creator: https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=devnet`);
    console.log(`   Admin: https://explorer.solana.com/address/${ADMIN_WALLET}?cluster=devnet`);

  } catch (error) {
    console.error('❌ Error creating collection:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
  }
}

// Run the script
createSwapperCollection();