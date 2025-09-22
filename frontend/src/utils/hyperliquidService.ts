import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";

// Initialize Hyperliquid Info Client for testnet
const infoClient = new InfoClient({
  transport: new HttpTransport({
    isTestnet: true, // Use testnet
  }),
});

export interface UserBalance {
  coin: string;
  total: string;
  available: string;
  hold: string;
}

export interface UserPortfolioData {
  accountValue: string;
  totalNtlPos: string;
  totalRawUsd: string;
  totalMarginUsed: string;
  balances: UserBalance[];
  spotBalances?: UserBalance[];
}

export interface UserPortfolioHistory {
  time: number;
  accountValue: string;
  totalNtlPos: string;
  totalMarginUsed: string;
}

export class HyperliquidService {
  /**
   * Get user's clearinghouse state (perp portfolio data)
   */
  static async getUserPortfolio(userAddress: string): Promise<UserPortfolioData | null> {
    try {
      const clearinghouseState = await infoClient.clearinghouseState({
        user: userAddress as `0x${string}`,
      });

      if (!clearinghouseState) {
        return null;
      }

      // Get spot balances too
      let spotBalances: UserBalance[] = [];
      try {
        const spotState = await infoClient.spotClearinghouseState({
          user: userAddress as `0x${string}`,
        });
        
        if (spotState && spotState.balances) {
          spotBalances = spotState.balances.map((balance: any) => ({
            coin: balance.coin,
            total: balance.total,
            available: balance.available,
            hold: balance.hold,
          }));
        }
      } catch (spotError) {
        console.log("No spot balances found:", spotError);
      }

      return {
        accountValue: clearinghouseState.marginSummary.accountValue,
        totalNtlPos: clearinghouseState.marginSummary.totalNtlPos,
        totalRawUsd: clearinghouseState.marginSummary.totalRawUsd,
        totalMarginUsed: clearinghouseState.marginSummary.totalMarginUsed,
        balances: clearinghouseState.assetPositions.map((asset: any) => ({
          coin: asset.position.coin,
          total: asset.position.szi,
          available: asset.position.szi,
          hold: "0",
        })),
        spotBalances,
      };
    } catch (error) {
      console.error("Error fetching user portfolio:", error);
      return null;
    }
  }

  /**
   * Get user's portfolio history for chart
   */
  static async getUserPortfolioHistory(userAddress: string): Promise<UserPortfolioHistory[]> {
    try {
      const portfolioData = await infoClient.portfolio({
        user: userAddress as `0x${string}`,
      });

      if (!portfolioData || !portfolioData.day) {
        return [];
      }

      return portfolioData.day.map((entry: any) => ({
        time: entry.time,
        accountValue: entry.accountValue,
        totalNtlPos: entry.totalNtlPos,
        totalMarginUsed: entry.totalMarginUsed,
      }));
    } catch (error) {
      console.error("Error fetching user portfolio history:", error);
      return [];
    }
  }

  /**
   * Get user's fills for volume calculation
   */
  static async getUserFills(userAddress: string, startTime?: number) {
    try {
      const fills = await infoClient.userFills({
        user: userAddress as `0x${string}`,
        startTime,
      });

      return fills;
    } catch (error) {
      console.error("Error fetching user fills:", error);
      return [];
    }
  }

  /**
   * Get user's open orders
   */
  static async getUserOpenOrders(userAddress: string) {
    try {
      const openOrders = await infoClient.openOrders({
        user: userAddress as `0x${string}`,
      });

      return openOrders;
    } catch (error) {
      console.error("Error fetching user open orders:", error);
      return [];
    }
  }

  /**
   * Get spot clearinghouse state for USDC balance
   */
  static async getUserSpotBalance(userAddress: string) {
    try {
      const spotState = await infoClient.spotClearinghouseState({
        user: userAddress as `0x${string}`,
      });

      return spotState;
    } catch (error) {
      console.error("Error fetching user spot balance:", error);
      return null;
    }
  }

  /**
   * Generate mock PnL data for chart based on account value
   */
  static generateMockPnLData(accountValue: number): Array<{ time: string; pnl: number }> {
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate realistic PnL variation around account value
      const variation = (Math.random() - 0.5) * accountValue * 0.2; // ±20% variation
      const pnl = accountValue + variation;
      
      data.push({
        time: date.toISOString().split('T')[0], // YYYY-MM-DD format
        pnl: Math.max(0, Math.round(pnl * 100) / 100), // Round to 2 decimal places, min 0
      });
    }
    
    return data;
  }

  /**
   * Convert portfolio history to chart format
   */
  static convertPortfolioHistoryToChartData(history: UserPortfolioHistory[]): Array<{ time: string; pnl: number }> {
    return history.map((entry) => ({
      time: new Date(entry.time).toISOString().split('T')[0],
      pnl: parseFloat(entry.accountValue),
    }));
  }
}

export default HyperliquidService;