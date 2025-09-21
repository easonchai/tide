import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketService } from './market.service';
import { Market, NFTPosition } from '@prisma/client';
import {
  CreateMarketDTO,
  UpdateMarketDTO,
  CreateNFTPositionDTO,
  CloseNFTPositionDTO,
  MarketStatus,
} from './dto/market.dto';
import {
  MarketResponseDTO,
  NFTPositionResponseDTO,
} from './dto/market-response.dto';
import { MarketTransactionService } from './providers/market-transaction.service';

@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly marketTransactionService: MarketTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new market' })
  @ApiResponse({
    status: 201,
    description: 'Market created successfully',
    type: MarketResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data format',
  })
  @ApiResponse({ status: 409, description: 'Address or slug already exists' })
  async createMarket(
    @Body() createMarketData: CreateMarketDTO,
  ): Promise<Market> {
    return this.marketService.createMarket(createMarketData);
  }

  @Post('positions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new NFT position' })
  @ApiResponse({
    status: 201,
    description: 'NFT position created successfully',
    type: NFTPositionResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data format',
  })
  @ApiResponse({ status: 404, description: 'Market or user not found' })
  async createNFTPosition(
    @Body() createPositionData: CreateNFTPositionDTO,
  ): Promise<NFTPosition> {
    const data = {
      market: { connect: { slug: createPositionData.marketSlug } },
      user: { connect: { address: createPositionData.userAddress } },
      onChainId: createPositionData.onChainId,
      amount: BigInt(createPositionData.amount),
      lowerBound: BigInt(createPositionData.lowerBound),
      upperBound: BigInt(createPositionData.upperBound),
      payout: BigInt(createPositionData.payout || '0'),
    };
    return this.marketTransactionService.createNFTPosition(data);
  }

  @Get('positions/user/:address')
  @ApiOperation({ summary: 'Get all NFT positions for a user' })
  @ApiParam({
    name: 'address',
    description: 'User address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiResponse({
    status: 200,
    description: 'List of NFT positions for the user',
    type: [NFTPositionResponseDTO],
  })
  async getNFTPositionsByUser(
    @Param('address') address: string,
  ): Promise<NFTPosition[]> {
    return this.marketTransactionService.getNFTPositionsByUser(address);
  }

  @Get('positions/market/:slug')
  @ApiOperation({ summary: 'Get all NFT positions for a market' })
  @ApiParam({
    name: 'slug',
    description: 'Market slug',
    example: 'bitcoin-100k-2024',
  })
  @ApiResponse({
    status: 200,
    description: 'List of NFT positions for the market',
    type: [NFTPositionResponseDTO],
  })
  async getNFTPositionsByMarket(
    @Param('slug') slug: string,
  ): Promise<NFTPosition[]> {
    return this.marketTransactionService.getNFTPositionsByMarket(slug);
  }

  @Put('positions/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an NFT position (sell/redeem/delete)' })
  @ApiParam({
    name: 'id',
    description: 'NFT position ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'NFT position closed successfully',
    type: NFTPositionResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'NFT position not found' })
  @ApiResponse({ status: 400, description: 'NFT position already closed' })
  async closeNFTPosition(
    @Param('id') id: string,
    @Body() closePositionData: CloseNFTPositionDTO,
  ): Promise<NFTPosition> {
    return this.marketTransactionService.closeNFTPosition(
      id,
      BigInt(closePositionData.payout),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all markets' })
  @ApiQuery({
    name: 'status',
    description: 'Filter markets by status',
    required: false,
    enum: MarketStatus,
  })
  @ApiResponse({
    status: 200,
    description: 'List of markets',
    type: [MarketResponseDTO],
  })
  async getAllMarkets(
    @Query('status') status?: MarketStatus,
  ): Promise<(Market & { volume: bigint })[]> {
    return this.marketService.getAllMarkets(undefined, status);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a market by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Market slug',
    example: 'bitcoin-100k-2024',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter market by status',
    required: false,
    enum: MarketStatus,
  })
  @ApiResponse({
    status: 200,
    description: 'Market found',
    type: MarketResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketBySlug(
    @Param('slug') slug: string,
    @Query('status') status?: MarketStatus,
  ): Promise<(Market & { volume: bigint }) | null> {
    return this.marketService.getMarket({ slug }, status);
  }

  @Put(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a market by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Market slug',
    example: 'bitcoin-100k-2024',
  })
  @ApiResponse({
    status: 200,
    description: 'Market updated successfully',
    type: MarketResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data format',
  })
  async updateMarket(
    @Param('slug') slug: string,
    @Body() updateMarketData: UpdateMarketDTO,
  ): Promise<Market> {
    return this.marketService.updateMarket({ slug }, updateMarketData);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a market by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Market slug',
    example: 'bitcoin-100k-2024',
  })
  @ApiResponse({
    status: 200,
    description: 'Market deleted successfully',
    type: MarketResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  @ApiResponse({ status: 400, description: 'Market already deleted' })
  async deleteMarket(@Param('slug') slug: string): Promise<Market> {
    return this.marketService.deleteMarket(slug);
  }
}
