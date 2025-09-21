import { Address } from 'viem'
import { createConfig, http } from 'wagmi'
import { hyperliquidEvmTestnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [hyperliquidEvmTestnet, sepolia],
  transports: {
    [hyperliquidEvmTestnet.id]: http(),
    [sepolia.id]: http(),
  },
})

export const marketContract = process.env.NEXT_PUBLIC_MARKET_ADDRESS as Address;
export const collateralContract = process.env.NEXT_PUBLIC_COLLATERAL_ADDRESS as Address;
