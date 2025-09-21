import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, NFTPosition } from '@prisma/client';

@Injectable()
export class MarketTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(MarketTransactionService.name);

  /**
   * Creates a new NFT position in the database
   * @param {Prisma.NFTPositionCreateInput} data - NFT position creation data
   * @returns {Promise<NFTPosition>} The created NFT position
   */
  async createNFTPosition(
    data: Prisma.NFTPositionCreateInput,
  ): Promise<NFTPosition> {
    this.logger.log(
      `Creating NFT position for market: ${data.market?.connect?.id} and user: ${data.user?.connect?.id}`,
    );
    try {
      const nftPosition = await this.prisma.nFTPosition.create({ data });
      this.logger.log(`NFT position created successfully: ${nftPosition.id}`);
      return nftPosition;
    } catch (error) {
      this.logger.error(
        `Failed to create NFT position: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves an NFT Position by unique identifier
   * @param {Prisma.NFTPositionWhereUniqueInput} where - Unique market identifier (id)
   * @returns {Promise<Market | null>} The market or null if not found
   */
  async getNFTPosition(
    where: Prisma.NFTPositionWhereUniqueInput,
  ): Promise<NFTPosition | null> {
    const nftPosition = await this.prisma.nFTPosition.findUnique({
      where,
    });

    return nftPosition;
  }

  /**
   * Closes an NFT position by setting the deletedAt timestamp and payout amount.
   * This method is used for multiple operations:
   * - Soft deleting positions
   * - Selling positions (with payout amount)
   * - Redeeming positions (with payout amount)
   * @param {string} id - The id of the NFT position to close
   * @param {bigint} payout - The payout amount for the position
   * @returns {Promise<NFTPosition>} The closed NFT position with updated payout
   */
  async closeNFTPosition(id: string, payout: bigint): Promise<NFTPosition> {
    this.logger.log(`Soft deleting NFT position: ${id}`);
    try {
      const nftPosition = await this.prisma.nFTPosition.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          payout,
        },
      });
      this.logger.log(
        `NFT position soft deleted successfully: ${nftPosition.id}`,
      );
      return nftPosition;
    } catch (error) {
      this.logger.error(
        `Failed to delete NFT position: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all active NFT positions for a specific user by address
   * @param {string} userAddress - The user address to get positions for
   * @param {boolean} includeClosed - Whether to include closed positions (default: false)
   * @returns {Promise<NFTPosition[]>} Array of NFT positions for the user
   */
  async getNFTPositionsByUser(
    userAddress: string,
    includeClosed: boolean = false,
  ): Promise<NFTPosition[]> {
    this.logger.log(`Getting NFT positions for user address: ${userAddress}`);
    try {
      const whereClause: Prisma.NFTPositionWhereInput = {
        user: {
          address: userAddress,
        },
      };

      if (!includeClosed) {
        whereClause.deletedAt = null;
      }

      const nftPositions = await this.prisma.nFTPosition.findMany({
        where: whereClause,
        include: {
          market: true,
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(
        `Found ${nftPositions.length} NFT positions for user address: ${userAddress}`,
      );
      return nftPositions;
    } catch (error) {
      this.logger.error(
        `Failed to get NFT positions for user address: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all active NFT positions for a specific market by slug
   * @param {string} marketSlug - The market slug to get positions for
   * @param {boolean} includeClosed - Whether to include closed positions (default: false)
   * @returns {Promise<NFTPosition[]>} Array of NFT positions for the market
   */
  async getNFTPositionsByMarket(
    marketSlug: string,
    includeClosed: boolean = false,
  ): Promise<NFTPosition[]> {
    this.logger.log(`Getting NFT positions for market slug: ${marketSlug}`);
    try {
      const whereClause: Prisma.NFTPositionWhereInput = {
        market: {
          slug: marketSlug,
        },
      };

      if (!includeClosed) {
        whereClause.deletedAt = null;
      }

      const nftPositions = await this.prisma.nFTPosition.findMany({
        where: whereClause,
        include: {
          market: true,
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(
        `Found ${nftPositions.length} NFT positions for market slug: ${marketSlug}`,
      );
      return nftPositions;
    } catch (error) {
      this.logger.error(
        `Failed to get NFT positions for market slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
