import { Injectable, Logger } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Hex,
  defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  private readonly hyperliquidTestnet = defineChain({
    id: 998,
    name: 'Hyperliquid Testnet',
    network: 'hyperliquid-testnet',
    nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
      public: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
    },
  });

  createPublicClient(): PublicClient {
    const client = createPublicClient({
      chain: this.hyperliquidTestnet,
      transport: http(),
    });
    return client as any;
  }

  async createAdminWalletClient(): Promise<WalletClient> {
    const privateKey = process.env.PRIVATE_KEY as Hex;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY is required for admin wallet client');
    }
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      chain: this.hyperliquidTestnet,
      transport: http(),
      account: account,
    });
    return client as any;
  }
}
