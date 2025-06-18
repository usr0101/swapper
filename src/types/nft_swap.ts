export type NftSwap = {
  "version": "0.1.0",
  "name": "nft_swap",
  "instructions": [
    {
      "name": "initializePool",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "collectionId",
          "type": "string"
        },
        {
          "name": "swapFee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositNft",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nftMint",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "swapNft",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userNewNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tempPoolAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeCollector",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userNftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolNftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "userNftMint",
          "type": "publicKey"
        },
        {
          "name": "poolNftMint",
          "type": "publicKey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "collectionId",
            "type": "string"
          },
          {
            "name": "swapFee",
            "type": "u64"
          },
          {
            "name": "nftCount",
            "type": "u32"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6002,
      "name": "InvalidNft",
      "msg": "Invalid NFT"
    },
    {
      "code": 6003,
      "name": "PoolNotFound",
      "msg": "Pool not found"
    },
    {
      "code": 6004,
      "name": "InvalidCollectionId",
      "msg": "Collection ID must be 15 characters or less"
    }
  ]
};

const IDL: NftSwap = {
  "version": "0.1.0",
  "name": "nft_swap",
  "instructions": [
    {
      "name": "initializePool",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "collectionId",
          "type": "string"
        },
        {
          "name": "swapFee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositNft",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nftMint",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "swapNft",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userNewNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolNftAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tempPoolAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeCollector",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userNftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "poolNftMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "userNftMint",
          "type": "publicKey"
        },
        {
          "name": "poolNftMint",
          "type": "publicKey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "collectionId",
            "type": "string"
          },
          {
            "name": "swapFee",
            "type": "u64"
          },
          {
            "name": "nftCount",
            "type": "u32"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6002,
      "name": "InvalidNft",
      "msg": "Invalid NFT"
    },
    {
      "code": 6003,
      "name": "PoolNotFound",
      "msg": "Pool not found"
    },
    {
      "code": 6004,
      "name": "InvalidCollectionId",
      "msg": "Collection ID must be 15 characters or less"
    }
  ]
};