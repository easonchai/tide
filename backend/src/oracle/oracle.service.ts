import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  /**
   * Manually resolves a market by slug
   * @param {string} slug - The market slug to resolve
   * @returns {Promise<any>} Resolution result with price data and transaction hash
   * @throws {Error} If market not found or resolution fails
   */
  async resolveMarket(slug: string): Promise<any> {
    this.logger.log(`Manual resolution requested for market: ${slug}`);

    const market = (await this.prisma.market.findUnique({
      where: { slug },
    })) as any;

    if (!market) {
      throw new Error(`Market with slug "${slug}" not found`);
    }

    if (market.status !== 'OPEN') {
      throw new Error(
        `Market "${slug}" is not open (status: ${market.status})`,
      );
    }

    await this.processResolveMarket(market);

    return {
      success: true,
      market: market.slug,
      message: `Market ${slug} resolved successfully`,
    };
  }

  /**
   * Resolves a single market by fetching price data and settling on-chain
   * @param {any} market - Market object containing id, slug, question, endDate, onChainId
   */
  private async processResolveMarket(market: any): Promise<void> {
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

      const scaledSettlement = BigInt(Math.round(priceData.close * 1e6));

      if (market.onChainId === null || market.onChainId === undefined) {
        throw new Error(`onChainId not set for market ${market.slug}`);
      }

      const txHash = await this.blockchain.settleMarket(
        BigInt(market.onChainId),
        scaledSettlement,
      );

      await this.prisma.market.update({
        where: { id: market.id },
        data: {
          status: 'CLOSED',
          resolvedAt: new Date(),
          resolutionOutcome: priceData.close.toString(),
        },
      });

      this.logger.log(
        `Market ${market.slug} resolved. Close: $${priceData.close}, TX: ${txHash}`,
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
      const transport = new HttpTransport({ isTestnet: false });
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
}
