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
      "name": "updatePoolStats",
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
        }
      ],
      "args": [
        {
          "name": "nftCount",
          "type": "u32"
        },
        {
          "name": "volume",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositSol",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawSol",
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createSwapOrder",
      "accounts": [
        {
          "name": "swapOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
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
          "name": "nftMint",
          "type": "publicKey"
        },
        {
          "name": "desiredTraits",
          "type": {
            "vec": "string"
          }
        }
      ]
    },
    {
      "name": "executeSwap",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "feeCollector",
          "isMut": true,
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
          "name": "swapFee",
          "type": "u64"
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
    },
    {
      "name": "SwapOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "desiredTraits",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "PoolInitialized",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
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
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "PoolStatsUpdated",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "oldNftCount",
          "type": "u32"
        },
        {
          "name": "newNftCount",
          "type": "u32"
        },
        {
          "name": "volumeAdded",
          "type": "u64"
        },
        {
          "name": "totalVolume",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SolDeposited",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SolWithdrawn",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "authority",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SwapOrderCreated",
      "fields": [
        {
          "name": "swapOrder",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "nftMint",
          "type": "publicKey"
        },
        {
          "name": "desiredTraits",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SwapExecuted",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "swapOrder",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "feeCollector",
          "type": "publicKey"
        },
        {
          "name": "swapFee",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
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
      "name": "InvalidOperation",
      "msg": "Invalid operation"
    },
    {
      "code": 6003,
      "name": "InvalidCollectionId",
      "msg": "Collection ID must be between 1 and 32 characters"
    },
    {
      "code": 6004,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6005,
      "name": "InvalidAmount",
      "msg": "Invalid amount - must be greater than 0"
    },
    {
      "code": 6006,
      "name": "AmountTooLarge",
      "msg": "Amount too large - maximum 100 SOL"
    },
    {
      "code": 6007,
      "name": "InsufficientRentExemption",
      "msg": "Account would not be rent exempt"
    },
    {
      "code": 6008,
      "name": "TooManyTraits",
      "msg": "Too many traits - maximum 10 allowed"
    },
    {
      "code": 6009,
      "name": "TraitNameTooLong",
      "msg": "Trait name too long - maximum 50 characters"
    },
    {
      "code": 6010,
      "name": "InvalidFeeCollector",
      "msg": "Invalid fee collector account"
    },
    {
      "code": 6011,
      "name": "InvalidFeeAmount",
      "msg": "Invalid fee amount - must match pool requirements"
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
      "name": "updatePoolStats",
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
        }
      ],
      "args": [
        {
          "name": "nftCount",
          "type": "u32"
        },
        {
          "name": "volume",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositSol",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawSol",
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createSwapOrder",
      "accounts": [
        {
          "name": "swapOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
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
          "name": "nftMint",
          "type": "publicKey"
        },
        {
          "name": "desiredTraits",
          "type": {
            "vec": "string"
          }
        }
      ]
    },
    {
      "name": "executeSwap",
      "accounts": [
        {
          "name": "pool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapOrder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "feeCollector",
          "isMut": true,
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
          "name": "swapFee",
          "type": "u64"
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
    },
    {
      "name": "SwapOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "desiredTraits",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "PoolInitialized",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
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
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "PoolStatsUpdated",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "oldNftCount",
          "type": "u32"
        },
        {
          "name": "newNftCount",
          "type": "u32"
        },
        {
          "name": "volumeAdded",
          "type": "u64"
        },
        {
          "name": "totalVolume",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SolDeposited",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SolWithdrawn",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "authority",
          "type": "publicKey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SwapOrderCreated",
      "fields": [
        {
          "name": "swapOrder",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "nftMint",
          "type": "publicKey"
        },
        {
          "name": "desiredTraits",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "SwapExecuted",
      "fields": [
        {
          "name": "pool",
          "type": "publicKey"
        },
        {
          "name": "swapOrder",
          "type": "publicKey"
        },
        {
          "name": "user",
          "type": "publicKey"
        },
        {
          "name": "feeCollector",
          "type": "publicKey"
        },
        {
          "name": "swapFee",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        }
      ]
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
      "name": "InvalidOperation",
      "msg": "Invalid operation"
    },
    {
      "code": 6003,
      "name": "InvalidCollectionId",
      "msg": "Collection ID must be between 1 and 32 characters"
    },
    {
      "code": 6004,
      "name": "ArithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6005,
      "name": "InvalidAmount",
      "msg": "Invalid amount - must be greater than 0"
    },
    {
      "code": 6006,
      "name": "AmountTooLarge",
      "msg": "Amount too large - maximum 100 SOL"
    },
    {
      "code": 6007,
      "name": "InsufficientRentExemption",
      "msg": "Account would not be rent exempt"
    },
    {
      "code": 6008,
      "name": "TooManyTraits",
      "msg": "Too many traits - maximum 10 allowed"
    },
    {
      "code": 6009,
      "name": "TraitNameTooLong",
      "msg": "Trait name too long - maximum 50 characters"
    },
    {
      "code": 6010,
      "name": "InvalidFeeCollector",
      "msg": "Invalid fee collector account"
    },
    {
      "code": 6011,
      "name": "InvalidFeeAmount",
      "msg": "Invalid fee amount - must match pool requirements"
    }
  ]
};

export default IDL;