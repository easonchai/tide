import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron job that runs every minute to check markets with end dates
   * and fetch price data from Hyperliquid for resolution
   * @returns {Promise<void>} Resolves when all markets in the execution window have been processed
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndResolveMarkets(): Promise<void> {
    const startMs = Date.now();
    this.logger.log('Oracle cron tick: checking markets for resolution...');

    try {
      const { windowStart, windowEnd } = this.getExecutionWindow();
      const marketsToResolve = await this.getMarketsToResolve(
        windowStart,
        windowEnd,
      );

      this.logger.log(
        `Window ${windowStart.toISOString()} → ${windowEnd.toISOString()} | markets to resolve: ${marketsToResolve.length}`,
      );

      for (const market of marketsToResolve) {
        try {
          this.logger.log(`Resolving market: ${market.slug} (${market.id})`);
          await this.resolveMarket(market);
        } catch (err: any) {
          this.logger.error(
            `Error resolving market ${market.slug}:`,
            err?.stack || String(err),
          );
        }
      }
    } catch (err: any) {
      this.logger.error('Oracle cron tick failed', err?.stack || String(err));
    } finally {
      this.logger.log(`Oracle cron tick finished in ${Date.now() - startMs}ms`);
    }
  }

  /**
   * Resolves a single market by fetching price data and updating status
   * @param {any} market - Market object containing id, slug, question, address, and endDate
   * @returns {Promise<void>} Resolves when market has been successfully resolved
   * @throws {Error} If coin symbol extraction fails or price data cannot be fetched
   */
  private async resolveMarket(market: any): Promise<void> {
    try {
      const coinSymbol = this.extractCoinSymbol(market.question);

      const priceData = await this.fetchHyperliquidPrice(
        coinSymbol,
        market.endDate,
      );

      if (!priceData) {
        this.logger.warn(
          `No price data found for ${coinSymbol} at ${market.endDate}`,
        );
        return;
      }

      const txHash = await this.sendToSmartContract(market.slug, priceData);

      await this.prisma.market.update({
        where: { id: market.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      this.logger.log(
        `Market ${market.slug} resolved successfully. Price: $${priceData.close}, TX: ${txHash}`,
      );
    } catch (error) {
      this.logger.error(`Failed to resolve market ${market.slug}:`, error);
      throw error;
    }
  }

  /**
   * Fetches price data from Hyperliquid for a specific coin and timestamp
   * @param {string} coinSymbol - The coin symbol to fetch price data for (e.g., 'BTC', 'ETH')
   * @param {Date} endDate - The end date of the market to determine the price timestamp
   * @returns {Promise<any>} Price data object containing open, high, low, close, volume, and timestamp
   * @throws {Error} If Hyperliquid API call fails or no candlestick data is found
   */
  private async fetchHyperliquidPrice(
    coinSymbol: string,
    endDate: Date,
  ): Promise<any> {
    try {
      const transport = new HttpTransport({ isTestnet: true });
      const infoClient = new InfoClient({ transport });

      const candleTime = new Date(endDate.getTime() - 60 * 1000);
      const startTime = candleTime.getTime();
      const endTime = endDate.getTime();

      this.logger.log(
        `Fetching ${coinSymbol} price data for ${candleTime.toISOString()}`,
      );

      const candlestickData = await infoClient.candleSnapshot({
        coin: coinSymbol,
        interval: '1m',
        startTime: startTime,
        endTime: endTime,
      });

      if (!candlestickData || candlestickData.length === 0) {
        this.logger.warn(`No candlestick data found for ${coinSymbol}`);
        return null;
      }

      const latestCandle = candlestickData[candlestickData.length - 1];

      return {
        open: parseFloat(latestCandle.o),
        high: parseFloat(latestCandle.h),
        low: parseFloat(latestCandle.l),
        close: parseFloat(latestCandle.c),
        volume: parseFloat(latestCandle.v),
        timestamp: latestCandle.t,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch Hyperliquid price for ${coinSymbol}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Extracts coin symbol from market question using keyword matching
   * Throws error if no match found to prevent silent failures
   * @param {string} question - The market question text to extract coin symbol from
   * @returns {string} The corresponding coin symbol (e.g., 'BTC', 'ETH', 'SOL', 'HYPE')
   * @throws {Error} If no coin symbol mapping is found for the question
   */
  private extractCoinSymbol(question: string): string {
    const questionLower = question.toLowerCase();

    if (questionLower.includes('bitcoin') || questionLower.includes('btc')) {
      return 'BTC';
    }
    if (questionLower.includes('ethereum') || questionLower.includes('eth')) {
      return 'ETH';
    }
    if (questionLower.includes('solana') || questionLower.includes('sol')) {
      return 'SOL';
    }
    if (
      questionLower.includes('hyperliquid') ||
      questionLower.includes('hype')
    ) {
      return 'HYPE';
    }

    throw new Error(
      `No coin symbol mapping found for market question: "${question}". Please add mapping for this token.`,
    );
  }

  /**
   * Mock smart contract interaction for sending price data
   * @param {string} marketAddress - The smart contract address to send price data to
   * @param {any} priceData - Price data object containing open, high, low, close, volume, and timestamp
   * @returns {Promise<string>} Mock transaction hash for the blockchain interaction
   */
  private async sendToSmartContract(
    marketAddress: string,
    priceData: any,
  ): Promise<string> {
    // Mock implementation - replace with actual smart contract call
    this.logger.log(
      `Sending price data to smart contract ${marketAddress}:`,
      priceData,
    );

    // Simulate blockchain transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    return mockTxHash;
  }

  /**
   * Gets markets that need to be resolved within the execution window
   * @param {Date} windowStart - Start of the execution window (1 minute ago)
   * @param {Date} windowEnd - End of the execution window (1 minute from now)
   * @returns {Promise<any[]>} Array of markets that need to be resolved
   */
  private async getMarketsToResolve(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<any[]> {
    const markets = await this.prisma.market.findMany({
      where: {
        status: 'OPEN',
        endDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        question: true,
        endDate: true,
      },
    });

    return markets;
  }

  /**
   * Manually resolves a market by slug
   * @param {string} slug - The market slug to resolve
   * @returns {Promise<any>} Resolution result with price data and transaction hash
   * @throws {Error} If market not found or resolution fails
   */
  async manualResolveMarket(slug: string): Promise<any> {
    this.logger.log(`Manual resolution requested for market: ${slug}`);

    const market = await this.prisma.market.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        question: true,
        endDate: true,
        status: true,
      },
    });

    if (!market) {
      throw new Error(`Market with slug "${slug}" not found`);
    }

    if (market.status !== 'OPEN') {
      throw new Error(
        `Market "${slug}" is not open (status: ${market.status})`,
      );
    }

    await this.resolveMarket(market);

    return {
      success: true,
      market: market.slug,
      message: `Market ${slug} resolved successfully`,
    };
  }

  /**
   * Tests Hyperliquid price fetching for a specific coin and date
   * @param {string} coinSymbol - The coin symbol to fetch (e.g., 'BTC', 'ETH')
   * @param {Date} endDate - The date to fetch price data for
   * @returns {Promise<any>} Price data from Hyperliquid
   * @throws {Error} If price fetching fails
   */
  async testFetchPrice(coinSymbol: string, endDate: Date): Promise<any> {
    this.logger.log(
      `Testing price fetch for ${coinSymbol} at ${endDate.toISOString()}`,
    );

    const priceData = await this.fetchHyperliquidPrice(coinSymbol, endDate);

    return {
      success: true,
      coinSymbol,
      endDate: endDate.toISOString(),
      priceData,
    };
  }

  /**
   * Calculates the execution window for markets that ended at least 1 minute ago
   * Only processes markets that have already ended to ensure price data is finalized
   * @returns {{ windowStart: Date; windowEnd: Date }} Object containing start and end dates for the execution window
   */
  private getExecutionWindow(): { windowStart: Date; windowEnd: Date } {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
    const windowEnd = new Date(now.getTime() - 60 * 1000); // 1 minute ago

    return { windowStart, windowEnd };
  }
}
