import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { Market } from '@prisma/client';
import { CreateMarketDto, UpdateMarketDto } from './dto/market.dto';
import { MarketResponseDto } from './dto/market-response.dto';

@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new market' })
  @ApiResponse({
    status: 201,
    description: 'Market created successfully',
    type: MarketResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data format',
  })
  @ApiResponse({ status: 409, description: 'Address or slug already exists' })
  async createMarket(
    @Body() createMarketData: CreateMarketDto,
  ): Promise<Market> {
    return this.marketService.createMarket(createMarketData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all markets' })
  @ApiResponse({
    status: 200,
    description: 'List of markets',
    type: [MarketResponseDto],
  })
  async getAllMarkets(): Promise<Market[]> {
    return this.marketService.getAllMarkets();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a market by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Market slug',
    example: 'bitcoin-100k-2024',
  })
  @ApiResponse({
    status: 200,
    description: 'Market found',
    type: MarketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketBySlug(@Param('slug') slug: string): Promise<Market | null> {
    return this.marketService.getMarket({ slug });
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
    type: MarketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data format',
  })
  async updateMarket(
    @Param('slug') slug: string,
    @Body() updateMarketData: UpdateMarketDto,
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
    type: MarketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  @ApiResponse({ status: 400, description: 'Market already deleted' })
  async deleteMarket(@Param('slug') slug: string): Promise<Market> {
    return this.marketService.deleteMarket(slug);
  }
}
