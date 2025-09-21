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
   * Closes an NFT position by setting the deletedAt timestamp and payout amount.
   * This method is used for multiple operations:
   * - Soft deleting positions
   * - Selling positions (with payout amount)
   * - Redeeming positions (with payout amount)
   * @param {string} id - The id of the NFT position to close
   * @param {bigint} payout - The payout amount for the position (0 for deletions)
   * @returns {Promise<NFTPosition>} The closed NFT position with updated payout
   */
  async deleteNFTPosition(id: string, payout: bigint): Promise<NFTPosition> {
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
}
