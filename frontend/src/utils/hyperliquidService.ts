import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface OrderParams {
  coin: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  orderType: 'MARKET' | 'LIMIT';
  limitPrice?: number;
  leverage?: number;
  isTestnet?: boolean;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  response?: any;
}

export class HyperliquidService {
  private infoClient: InfoClient;
  private exchangeClient: ExchangeClient | null = null;
  private isTestnet: boolean;
  private connectedWalletAddress: string | null = null;

  // Your builder config - these should match your approved builder setup
  private readonly BUILDER_ADDRESS = '0x476E8bDaa5645DCdEdeAb89cA7F939E8F30759D0'; // Your main wallet
  private readonly BUILDER_FEE_TENTHS_BPS = 10; // 10 tenths-bps = 1 bps = 0.01%

  constructor(isTestnet: boolean = false) {
    this.isTestnet = isTestnet;
    const transport = new HttpTransport({ isTestnet });
    this.infoClient = new InfoClient({ transport });
  }

  // Initialize with API wallet (for demo purposes)
  async initializeWithApiWallet(): Promise<boolean> {
    try {
      // For demo, we'll use your API wallet private key
      // In production, users would either:
      // 1. Generate their own API wallet
      // 2. Use a proper wallet integration that handles chain switching
      const apiPrivateKey = '0xc719f2e0e659be21bc1ed2662e537bfa438a8b23622444e2309d9455ea1be8b0';
      
      if (!apiPrivateKey) {
        throw new Error('API wallet not configured');
      }

      // Create account from API private key
      const account = privateKeyToAccount(apiPrivateKey as `0x${string}`);

      // Create exchange client
      const transport = new HttpTransport({ isTestnet: this.isTestnet });
      this.exchangeClient = new ExchangeClient({
        wallet: account,
        transport,
        isTestnet: this.isTestnet
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize API wallet:', error);
      return false;
    }
  }

  // Initialize with private key (avoiding MetaMask chain issues)
  async initializeWithWallet(walletAddress: string): Promise<boolean> {
    try {
      this.connectedWalletAddress = walletAddress;

      // Use your private key directly for signing (from .env)
      const privateKey = '0x060e191df5136a283c2959c9bc1bb6dc089460e56619782238d19129fbe57b39';
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      // Create exchange client
      const transport = new HttpTransport({ isTestnet: this.isTestnet });
      this.exchangeClient = new ExchangeClient({
        wallet: account,
        transport,
        isTestnet: this.isTestnet
      });

      console.log('✅ Hyperliquid SDK initialized with private key signing');
      return true;
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      return false;
    }
  }


  // Get current market price for a coin from Hyperliquid testnet
  async getCurrentPrice(coinSymbol: string): Promise<number> {
    try {
      const book = await this.infoClient.l2Book({ coin: coinSymbol });
      
      if (!book?.levels) {
        throw new Error('Failed to fetch order book');
      }

      const [bids, asks] = book.levels;
      const bestBid = bids[0]?.px;
      const bestAsk = asks[0]?.px;
      
      // Return mid price
      if (bestBid && bestAsk) {
        return (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
      }
      
      return parseFloat(bestBid || bestAsk || '0');
    } catch (error) {
      console.error('Failed to get current price:', error);
      throw error;
    }
  }

  // Get all current prices for display in UI
  async getAllPrices(): Promise<Record<string, number>> {
    try {
      const prices: Record<string, number> = {};
      const coins = ['BTC', 'ETH', 'SOL', 'HYPE'];
      
      for (const coin of coins) {
        try {
          prices[coin] = await this.getCurrentPrice(coin);
        } catch (error) {
          console.error(`Failed to get ${coin} price:`, error);
          prices[coin] = 0;
        }
      }
      
      return prices;
    } catch (error) {
      console.error('Failed to get all prices:', error);
      return {};
    }
  }

  // Place a perp order
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      if (!this.exchangeClient) {
        throw new Error('Wallet not initialized. Call initializeWithWallet() first.');
      }

      const { coin, direction, size, orderType, limitPrice, leverage } = params;
      
      console.log('📊 Order params:', { coin, direction, size, orderType, limitPrice, leverage });
      
      // Get asset index and metadata
      const meta = await this.infoClient.meta();
      const assetIndex = meta.universe.findIndex(
        (asset: any) => asset.name.toLowerCase() === coin.toLowerCase()
      );
      
      if (assetIndex < 0) {
        throw new Error(`Asset ${coin} not found`);
      }
      
      const assetInfo = meta.universe[assetIndex];
      const szDecimals = assetInfo.szDecimals;
      
      // Get tick size for proper price formatting
      const tickSize = parseFloat(assetInfo.tickSize || '0.01');
      
      console.log('📋 Asset info:', { coin, assetIndex, szDecimals, tickSize });
      
      // Helper function to round price to valid tick size based on real testing
      const roundToTickSize = (price: number): string => {
        if (coin === 'BTC') {
          // BTC uses 1.0 tick size
          return Math.round(price).toString();
        } else if (coin === 'ETH') {
          // ETH uses 0.1 tick size
          return (Math.round(price * 10) / 10).toString();
        } else if (coin === 'SOL') {
          // SOL uses 0.01 tick size
          return (Math.round(price * 100) / 100).toString();
        } else if (coin === 'HYPE') {
          // HYPE uses 0.001 tick size
          return (Math.round(price * 1000) / 1000).toString();
        } else {
          // Default to 0.01 for other assets
          return (Math.round(price * 100) / 100).toString();
        }
      };
      
      // Determine price
      let price: string;
      if (orderType === 'MARKET') {
        // For market orders, use IOC with aggressive pricing to ensure execution
        const book = await this.infoClient.l2Book({ coin });
        if (!book?.levels) {
          throw new Error('Failed to get order book for market order');
        }
        
        const [bids, asks] = book.levels;
        
        if (direction === 'LONG') {
          // For buying, use ask price (or slightly above)
          const bestAsk = parseFloat(asks[0]?.px || '0');
          if (!bestAsk) throw new Error('No ask price available');
          price = roundToTickSize(bestAsk * 1.001); // Small premium to ensure execution
        } else {
          // For selling, use bid price (or slightly below)
          const bestBid = parseFloat(bids[0]?.px || '0');
          if (!bestBid) throw new Error('No bid price available');
          price = roundToTickSize(bestBid * 0.999); // Small discount to ensure execution
        }
      } else {
        if (!limitPrice) {
          throw new Error('Limit price required for limit orders');
        }
        price = roundToTickSize(limitPrice);
      }

      // Set leverage if provided
      if (leverage && leverage !== 1) {
        await this.exchangeClient.updateLeverage({
          asset: assetIndex,
          isCross: true,
          leverage
        });
      }

      // Calculate proper order size based on position value and current price
      // User enters position size in USDC value, we need to convert to coin quantity
      const currentPrice = parseFloat(price);
      const coinQuantity = size / currentPrice; // Convert USDC to coin quantity
      
      // Format size with correct decimal precision for this asset
      const formattedSize = coinQuantity.toFixed(szDecimals);
      const formattedPrice = price; // Already formatted by roundToTickSize
      
      console.log('💰 Order sizing:', {
        inputSizeUSDC: size,
        pricePerCoin: currentPrice,
        coinQuantity: coinQuantity,
        formattedSize: formattedSize,
        formattedPrice: formattedPrice,
        szDecimals: szDecimals
      });

      // Prepare order according to Hyperliquid API spec
      const orderAction = {
        orders: [{
          a: assetIndex,
          b: direction === 'LONG',
          p: formattedPrice,
          s: formattedSize,
          r: false,
          t: { 
            limit: { 
              tif: orderType === 'MARKET' ? 'Ioc' : 'Gtc'
            } 
          }
        }],
        grouping: 'na',
        builder: {
          b: this.BUILDER_ADDRESS,
          f: this.BUILDER_FEE_TENTHS_BPS
        }
      };

      console.log('Placing order with structure:', JSON.stringify(orderAction, null, 2));
      
      // Execute order
      const response = await this.exchangeClient.order(orderAction as any);
      
      console.log('Order response:', response);

      if (response.status === 'ok') {
        const status = response.response?.data?.statuses?.[0];
        const orderId = 'resting' in status ? status.resting.oid : 
                       'filled' in status ? status.filled.oid : undefined;
        
        return {
          success: true,
          response: response.response,
          orderId: orderId?.toString()
        };
      } else {
        return {
          success: false,
          error: typeof response.response === 'string' ? response.response : 'Order failed',
          response
        };
      }
    } catch (error: any) {
      console.error('Order placement failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        response: error
      };
    }
  }

  // Get user's account info
  async getAccountInfo(userAddress: string) {
    try {
      const clearinghouse = await this.infoClient.clearinghouseState({ 
        user: userAddress as `0x${string}`
      });
      return clearinghouse;
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  // Get user's open positions
  async getOpenPositions(userAddress: string) {
    try {
      const clearinghouse = await this.infoClient.clearinghouseState({ 
        user: userAddress as `0x${string}`
      });
      return clearinghouse?.assetPositions || [];
    } catch (error) {
      console.error('Failed to get positions:', error);
      throw error;
    }
  }

  // Check if connected wallet has sufficient balance for order
  async checkBalance(requiredMargin: number): Promise<boolean> {
    try {
      if (!this.connectedWalletAddress) {
        throw new Error('Wallet not connected');
      }

      const account = await this.getAccountInfo(this.connectedWalletAddress);
      const availableBalance = parseFloat(account?.withdrawable || '0');
      console.log(`Balance check: Available: $${availableBalance}, Required: $${requiredMargin}`);
      return availableBalance >= requiredMargin;
    } catch (error) {
      console.error('Failed to check balance:', error);
      return false;
    }
  }
}