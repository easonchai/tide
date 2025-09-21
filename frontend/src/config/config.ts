import { createConfig, http } from 'wagmi'
import { hyperliquidEvmTestnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [hyperliquidEvmTestnet, sepolia],
  transports: {
    [hyperliquidEvmTestnet.id]: http(),
    [sepolia.id]: http(),
  },
})
