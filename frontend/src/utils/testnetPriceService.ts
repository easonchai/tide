import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

// Service to fetch prices from Hyperliquid testnet (read-only, no wallet needed)
class TestnetPriceService {
  private infoClient: InfoClient;
  private priceCache: Record<string, { price: number; timestamp: number }> = {};
  private readonly CACHE_DURATION = 10 * 1000; // 10 seconds

  constructor() {
    // Only use InfoClient for read-only operations (no wallet needed)
    const transport = new HttpTransport({ isTestnet: true });
    this.infoClient = new InfoClient({ transport });
  }

  // Get cached price or fetch new one
  async getPrice(coin: string): Promise<number> {
    const now = Date.now();
    const cached = this.priceCache[coin];

    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      console.log(`🔍 Fetching ${coin} price from testnet...`);
      const book = await this.infoClient.l2Book({ coin });
      
      if (!book?.levels) {
        console.error(`❌ No order book levels for ${coin}`);
        throw new Error('Failed to fetch order book');
      }

      const [bids, asks] = book.levels;
      const bestBid = bids[0]?.px;
      const bestAsk = asks[0]?.px;
      
      console.log(`📊 ${coin} order book:`, { bestBid, bestAsk });
      
      // Calculate mid price with better error handling
      let price = 0;
      if (bestBid && bestAsk) {
        const bidPrice = parseFloat(bestBid);
        const askPrice = parseFloat(bestAsk);
        
        if (!isNaN(bidPrice) && !isNaN(askPrice)) {
          price = (bidPrice + askPrice) / 2;
        } else {
          console.error(`❌ Invalid bid/ask prices for ${coin}:`, { bidPrice, askPrice });
          throw new Error(`Invalid price data for ${coin}`);
        }
      } else if (bestBid) {
        price = parseFloat(bestBid);
        if (isNaN(price)) {
          console.error(`❌ Invalid bid price for ${coin}:`, bestBid);
          throw new Error(`Invalid bid price for ${coin}`);
        }
      } else if (bestAsk) {
        price = parseFloat(bestAsk);
        if (isNaN(price)) {
          console.error(`❌ Invalid ask price for ${coin}:`, bestAsk);
          throw new Error(`Invalid ask price for ${coin}`);
        }
      } else {
        console.error(`❌ No bid or ask prices for ${coin}`);
        throw new Error(`No price data available for ${coin}`);
      }

      if (isNaN(price)) {
        console.error(`❌ Calculated NaN price for ${coin}:`, { bestBid, bestAsk, price });
        throw new Error(`Calculated NaN price for ${coin}`);
      }
      
      console.log(`✅ ${coin} price: $${price}`);
      this.priceCache[coin] = { price, timestamp: now };
      return price;
    } catch (error) {
      console.error(`❌ Failed to get ${coin} price from testnet:`, error);
      return cached?.price || 0;
    }
  }

  // Get all key prices at once
  async getAllPrices(): Promise<Record<string, { price: number; change24h: number; marketCap: number }>> {
    try {
      const coins = ['BTC', 'ETH', 'SOL', 'HYPE'];
      const prices: Record<string, number> = {};
      
      // Fetch prices for all coins
      for (const coin of coins) {
        try {
          prices[coin] = await this.getPrice(coin);
        } catch (error) {
          console.error(`Failed to get ${coin} price:`, error);
          prices[coin] = 0;
        }
      }
      
      // Format to match the existing API structure
      return {
        bitcoin: {
          price: prices.BTC || 0,
          change24h: 0, // Testnet doesn't provide 24h change
          marketCap: 0
        },
        ethereum: {
          price: prices.ETH || 0,
          change24h: 0,
          marketCap: 0
        },
        solana: {
          price: prices.SOL || 0,
          change24h: 0,
          marketCap: 0
        },
        hyperliquid: {
          price: prices.HYPE || 0,
          change24h: 0,
          marketCap: 0
        }
      };
    } catch (error) {
      console.error('Failed to get all testnet prices:', error);
      return {
        bitcoin: { price: 0, change24h: 0, marketCap: 0 },
        ethereum: { price: 0, change24h: 0, marketCap: 0 },
        solana: { price: 0, change24h: 0, marketCap: 0 },
        hyperliquid: { price: 0, change24h: 0, marketCap: 0 }
      };
    }
  }
}

// Export singleton instance
export const testnetPriceService = new TestnetPriceService();
export default testnetPriceService;