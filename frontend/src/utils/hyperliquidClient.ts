import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

// Types for order parameters
export interface HyperliquidOrderParams {
  coin: string;
  size: string;
  price?: string;
  isLong: boolean;
  leverage: number;
  orderType: 'MARKET' | 'LIMIT';
}

export interface HyperliquidPosition {
  coin: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

class HyperliquidClientService {
  private exchClient: ExchangeClient | null = null;
  private infoClient: InfoClient | null = null;
  private isTestnet: boolean;

  constructor() {
    this.isTestnet = process.env.HL_TESTNET === 'true';
    this.initializeClients();
  }

  private initializeClients() {
    try {
      const privateKey = process.env.HL_PRIVATE_KEY as `0x${string}`;
      
      if (!privateKey) {
        throw new Error('HL_PRIVATE_KEY not found in environment variables');
      }

      const account = privateKeyToAccount(privateKey);
      const transport = new HttpTransport({ isTestnet: this.isTestnet });
      
      this.exchClient = new ExchangeClient({ 
        wallet: account, 
        transport,
      });
      
      this.infoClient = new InfoClient({ transport });
      
      console.log(`Hyperliquid client initialized for ${this.isTestnet ? 'TESTNET' : 'MAINNET'}`);
    } catch (error) {
      console.error('Failed to initialize Hyperliquid clients:', error);
    }
  }

  // Get asset ID from coin symbol
  private getAssetId(coin: string): number {
    const coinSymbol = coin.toUpperCase();
    
    // Testnet asset mappings (adjust these based on actual testnet meta)
    if (this.isTestnet) {
      switch (coinSymbol) {
        case 'BTC': return 0;
        case 'ETH': return 1; 
        case 'SOL': return 2;
        case 'HYPE': return 3;
        default: return 0; // Default to BTC
      }
    }
    
    // Mainnet asset mappings
    switch (coinSymbol) {
      case 'BTC': return 0;
      case 'ETH': return 1;
      case 'SOL': return 2;
      case 'HYPE': return 107; // Based on your earlier comment
      default: return 0; // Default to BTC
    }
  }

  // Place a market or limit order
  async placeOrder(params: HyperliquidOrderParams) {
    if (!this.exchClient) {
      throw new Error('Exchange client not initialized');
    }

    try {
      const assetId = this.getAssetId(params.coin);
      
      // For market orders, we'll use a limit order with a price that ensures immediate execution
      let orderPrice = params.price;
      
      if (params.orderType === 'MARKET' && !orderPrice) {
        // Get current market price for market orders
        const currentPrice = await this.getCurrentPrice(params.coin);
        if (!currentPrice) {
          throw new Error('Unable to get current market price');
        }
        
        // Set price slightly above/below market to ensure execution
        const priceAdjustment = params.isLong ? 1.001 : 0.999; // 0.1% adjustment
        orderPrice = (currentPrice * priceAdjustment).toString();
      }

      if (!orderPrice) {
        throw new Error('Order price is required');
      }

      const order = {
        a: assetId, // asset ID
        b: params.isLong, // buy (true for long, false for short)
        p: orderPrice, // price
        s: params.size, // size
        r: false, // reduce only
        t: {
          limit: {
            tif: params.orderType === 'MARKET' ? 'Ioc' as const : 'Gtc' as const, // time in force
          },
        },
      };

      // Set leverage if different from current
      if (params.leverage !== 1) {
        await this.exchClient.updateLeverage({
          asset: assetId,
          isCross: true,
          leverage: params.leverage,
        });
      }

      const result = await this.exchClient.order({
        orders: [order],
        grouping: 'na',
      });

      return result;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  // Get current price for a coin
  async getCurrentPrice(coin: string): Promise<number | null> {
    if (!this.infoClient) {
      throw new Error('Info client not initialized');
    }

    try {
      const assetId = this.getAssetId(coin);
      const l2Book = await this.infoClient.l2Book({ coin: assetId.toString() });
      
      if (l2Book && l2Book.levels && l2Book.levels.length > 0) {
        // Get mid price from best bid and ask
        const bestBid = parseFloat(l2Book.levels[0][0].px);
        const bestAsk = parseFloat(l2Book.levels[1][0].px);
        return (bestBid + bestAsk) / 2;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  // Get user's positions
  async getPositions(): Promise<HyperliquidPosition[]> {
    if (!this.infoClient) {
      throw new Error('Info client not initialized');
    }

    try {
      const privateKey = process.env.HL_PRIVATE_KEY as `0x${string}`;
      const account = privateKeyToAccount(privateKey);
      
      const state = await this.infoClient.clearinghouseState({ 
        user: account.address 
      });

      if (!state.assetPositions) {
        return [];
      }

      return state.assetPositions.map((position: any) => ({
        coin: this.getCoinFromAssetId(position.asset || 0),
        side: parseFloat(position.szi) > 0 ? 'LONG' : 'SHORT',
        size: Math.abs(parseFloat(position.szi)),
        entryPrice: parseFloat(position.entryPx || '0'),
        unrealizedPnl: parseFloat(position.unrealizedPnl || '0'),
        leverage: position.leverage || 1,
      }));
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  }

  // Helper function to get coin symbol from asset ID
  private getCoinFromAssetId(assetId: number): string {
    if (this.isTestnet) {
      switch (assetId) {
        case 0: return 'BTC';
        case 1: return 'ETH';
        case 2: return 'SOL';
        case 3: return 'HYPE';
        default: return 'UNKNOWN';
      }
    }
    
    switch (assetId) {
      case 0: return 'BTC';
      case 1: return 'ETH';
      case 2: return 'SOL';
      case 107: return 'HYPE';
      default: return 'UNKNOWN';
    }
  }

  // Get user's balance
  async getBalance(): Promise<number> {
    if (!this.infoClient) {
      throw new Error('Info client not initialized');
    }

    try {
      const privateKey = process.env.HL_PRIVATE_KEY as `0x${string}`;
      const account = privateKeyToAccount(privateKey);
      
      const state = await this.infoClient.clearinghouseState({ 
        user: account.address 
      });

      return parseFloat(state.withdrawable || '0');
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Check if client is ready
  isReady(): boolean {
    return this.exchClient !== null && this.infoClient !== null;
  }

  // Get network info
  getNetworkInfo() {
    return {
      isTestnet: this.isTestnet,
      network: this.isTestnet ? 'TESTNET' : 'MAINNET',
    };
  }
}

// Export singleton instance
export const hyperliquidClient = new HyperliquidClientService();
export default hyperliquidClient;