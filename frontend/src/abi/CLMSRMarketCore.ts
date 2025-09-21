import { Abi } from "viem";

export const CLMSRMarketCoreABI = [
  {
    type: "function",
    name: "FEE_RANGE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_LIQUIDITY_PARAMETER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_TICK_COUNT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_LIQUIDITY_PARAMETER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "UPGRADE_INTERFACE_VERSION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "_nextMarketId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "applyRangeFactor",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lo",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "hi",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "factor",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calculateClaimAmount",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateCloseProceeds",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateDecreaseProceeds",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "sellQuantity",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    outputs: [
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateIncreaseCost",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "additionalQuantity",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    outputs: [
      {
        name: "cost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateOpenCost",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lowerTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "upperTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "quantity",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    outputs: [
      {
        name: "cost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateQuantityFromCost",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lowerTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "upperTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "costPlusFees",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "quantity",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimPayout",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "payout",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "closePosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minProceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      {
        name: "minTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "maxTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "tickSpacing",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "startTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "endTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "settlementTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "liquidityParameter",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decreasePosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "sellQuantity",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "minProceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "newQuantity",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emitPositionSettledBatch",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMarket",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct ICLMSRMarketCore.Market",
        components: [
          {
            name: "isActive",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "settled",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "startTimestamp",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "endTimestamp",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "settlementTick",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "minTick",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "maxTick",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "tickSpacing",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "numBins",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "liquidityParameter",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "positionEventsCursor",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "positionEventsEmitted",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "settlementValue",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "settlementTimestamp",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPaymentToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPositionContract",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRangeSum",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lo",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "hi",
        type: "int256",
        internalType: "int256",
      },
    ],
    outputs: [
      {
        name: "sum",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "increasePosition",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "additionalQuantity",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "maxCost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "newQuantity",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_paymentToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "_positionContract",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isPaused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketTrees",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "root",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "nextIndex",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "size",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "cachedRootSum",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "markets",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "isActive",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "settled",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "startTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "endTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "settlementTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "minTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "maxTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "tickSpacing",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "numBins",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "liquidityParameter",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "positionEventsCursor",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "positionEventsEmitted",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "settlementValue",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "settlementTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "openPosition",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lowerTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "upperTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "quantity",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "maxCost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "positionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [
      {
        name: "reason",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paymentToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionContract",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ICLMSRPosition",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionSettledEmitted",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "propagateLazy",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lo",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "hi",
        type: "int256",
        internalType: "int256",
      },
    ],
    outputs: [
      {
        name: "sum",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reopenMarket",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFeeRate",
    inputs: [
      {
        name: "_feeRate",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTreasuryAddress",
    inputs: [
      {
        name: "_treasury",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleMarket",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "settlementValue",
        type: "int256",
        internalType: "int256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMarketTiming",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newStartTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "newEndTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "newSettlementTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address",
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "DebugSellProceeds",
    inputs: [
      {
        name: "step",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "value1",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "value2",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "message",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EmergencyPaused",
    inputs: [
      {
        name: "by",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "reason",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EmergencyUnpaused",
    inputs: [
      {
        name: "by",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "startTimestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "endTimestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "minTick",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "maxTick",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "tickSpacing",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "numBins",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "liquidityParameter",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketReopened",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketSettled",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "settlementTick",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketSettlementValueSubmitted",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "settlementValue",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketTimingUpdated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "newStartTimestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "newEndTimestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionClaimed",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "payout",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionClosed",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "proceeds",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionDecreased",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sellQuantity",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "newQuantity",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "proceeds",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionEventsProgress",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "from",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "to",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "done",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionIncreased",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "additionalQuantity",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "newQuantity",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "cost",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionOpened",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lowerTick",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "upperTick",
        type: "int256",
        indexed: false,
        internalType: "int256",
      },
      {
        name: "quantity",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "cost",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionSettled",
    inputs: [
      {
        name: "positionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "trader",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "payout",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "isWin",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RangeFactorApplied",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lo",
        type: "int256",
        indexed: true,
        internalType: "int256",
      },
      {
        name: "hi",
        type: "int256",
        indexed: true,
        internalType: "int256",
      },
      {
        name: "factor",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SettlementTimestampUpdated",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "settlementTimestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "AddressInsufficientBalance",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "AffectedSumZero",
    inputs: [],
  },
  {
    type: "error",
    name: "BinCountExceedsLimit",
    inputs: [
      {
        name: "requested",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "maxAllowed",
        type: "uint32",
        internalType: "uint32",
      },
    ],
  },
  {
    type: "error",
    name: "ChunkLimitExceeded",
    inputs: [
      {
        name: "required",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CostExceedsMaximum",
    inputs: [
      {
        name: "cost",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ERC1967InvalidImplementation",
    inputs: [
      {
        name: "implementation",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ERC1967NonPayable",
    inputs: [],
  },
  {
    type: "error",
    name: "EnforcedPause",
    inputs: [],
  },
  {
    type: "error",
    name: "ExpectedPause",
    inputs: [],
  },
  {
    type: "error",
    name: "FactorOutOfBounds",
    inputs: [],
  },
  {
    type: "error",
    name: "FailedInnerCall",
    inputs: [],
  },
  {
    type: "error",
    name: "IncompleteChunkProcessing",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "required",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "available",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientPositionQuantity",
    inputs: [
      {
        name: "want",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "have",
        type: "uint128",
        internalType: "uint128",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidLiquidityParameter",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidMarketParameters",
    inputs: [
      {
        name: "minTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "maxTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "tickSpacing",
        type: "int256",
        internalType: "int256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidQuantity",
    inputs: [
      {
        name: "qty",
        type: "uint128",
        internalType: "uint128",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidRangeBins",
    inputs: [
      {
        name: "lowerBin",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "upperBin",
        type: "uint32",
        internalType: "uint32",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidRangeCount",
    inputs: [
      {
        name: "ranges",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "maxAllowed",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTick",
    inputs: [
      {
        name: "tick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "minTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "maxTick",
        type: "int256",
        internalType: "int256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTickRange",
    inputs: [
      {
        name: "lowerTick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "upperTick",
        type: "int256",
        internalType: "int256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTickSpacing",
    inputs: [
      {
        name: "tick",
        type: "int256",
        internalType: "int256",
      },
      {
        name: "tickSpacing",
        type: "int256",
        internalType: "int256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTimeRange",
    inputs: [],
  },
  {
    type: "error",
    name: "MarketAlreadyExists",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "MarketAlreadySettled",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "MarketExpired",
    inputs: [],
  },
  {
    type: "error",
    name: "MarketNotActive",
    inputs: [],
  },
  {
    type: "error",
    name: "MarketNotFound",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "MarketNotSettled",
    inputs: [
      {
        name: "marketId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "MarketNotStarted",
    inputs: [],
  },
  {
    type: "error",
    name: "MathMulOverflow",
    inputs: [],
  },
  {
    type: "error",
    name: "NoChunkProgress",
    inputs: [],
  },
  {
    type: "error",
    name: "NonIncreasingSum",
    inputs: [
      {
        name: "beforeSum",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "afterSum",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ProceedsBelowMinimum",
    inputs: [
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minProceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "QuantityOverflow",
    inputs: [],
  },
  {
    type: "error",
    name: "RangeBinsOutOfBounds",
    inputs: [
      {
        name: "lowerBin",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "upperBin",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "numBins",
        type: "uint32",
        internalType: "uint32",
      },
    ],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "ResidualQuantity",
    inputs: [
      {
        name: "remaining",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "SettlementTooEarly",
    inputs: [
      {
        name: "requiredTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "currentTimestamp",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "SumAfterZero",
    inputs: [],
  },
  {
    type: "error",
    name: "TreeNotInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "UUPSUnauthorizedCallContext",
    inputs: [],
  },
  {
    type: "error",
    name: "UUPSUnsupportedProxiableUUID",
    inputs: [
      {
        name: "slot",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "UnauthorizedCaller",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroLimit",
    inputs: [],
  },
] as Abi;
