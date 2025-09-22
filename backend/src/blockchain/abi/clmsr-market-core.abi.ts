export const clmsrMarketCoreAbi = [
  {
    type: 'function',
    name: 'settleMarket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'settlementValue', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
