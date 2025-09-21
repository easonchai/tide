import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Market } from '@prisma/client';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(MarketService.name);

  /**
   * Creates a new market in the database
   * @param {Prisma.MarketCreateInput} data - Market creation data
   * @returns {Promise<Market>} The created market
   */
  async createMarket(data: Prisma.MarketCreateInput): Promise<Market> {
    this.logger.log(`Creating market with question: ${data.question}`);
    try {
      const market = await this.prisma.market.create({ data });
      this.logger.log(`Market created successfully: ${market.id}`);
      return market;
    } catch (error) {
      this.logger.error(
        `Failed to create market: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves a market by unique identifier
   * @param {Prisma.MarketWhereUniqueInput} where - Unique market identifier (id, address, or slug)
   * @returns {Promise<Market | null>} The market or null if not found
   */
  async getMarket(
    where: Prisma.MarketWhereUniqueInput,
  ): Promise<Market | null> {
    const market = await this.prisma.market.findUnique({
      where,
    });

    return market;
  }

  /**
   * Retrieves all markets with optional filtering
   * @param {Prisma.MarketFindManyArgs} args - Optional filtering and pagination arguments
   * @returns {Promise<Market[]>} Array of markets
   */
  async getAllMarkets(args?: Prisma.MarketFindManyArgs): Promise<Market[]> {
    const defaultArgs: Prisma.MarketFindManyArgs = {
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...args,
    };

    return this.prisma.market.findMany(defaultArgs);
  }

  /**
   * Updates a market by unique identifier
   * @param {Prisma.MarketWhereUniqueInput} where - Unique market identifier
   * @param {Prisma.MarketUpdateInput} data - Market update data
   * @returns {Promise<Market>} The updated market
   */
  async updateMarket(
    where: Prisma.MarketWhereUniqueInput,
    data: Prisma.MarketUpdateInput,
  ): Promise<Market> {
    this.logger.log(`Updating market: ${JSON.stringify(where)}`);
    try {
      const market = await this.prisma.market.update({
        where,
        data,
      });
      this.logger.log(`Market updated successfully: ${market.id}`);
      return market;
    } catch (error) {
      this.logger.error(
        `Failed to update market: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Performs a soft delete on a market by setting the deletedAt timestamp
   * @param {string} slug - The slug of the market to delete
   * @returns {Promise<Market>} The soft-deleted market
   * @throws {PrismaClientKnownRequestError} If market is not found or already deleted
   */
  async deleteMarket(slug: string): Promise<Market> {
    this.logger.log(`Soft deleting market: ${slug}`);
    try {
      const market = await this.prisma.market.update({
        where: {
          slug,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      this.logger.log(`Market soft deleted successfully: ${market.id}`);
      return market;
    } catch (error) {
      this.logger.error(
        `Failed to delete market: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
