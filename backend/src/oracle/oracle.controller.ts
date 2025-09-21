import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { OracleService } from './oracle.service';

@ApiTags('Oracle')
@Controller('oracle')
export class OracleController {
  private readonly logger = new Logger(OracleController.name);

  constructor(private readonly oracleService: OracleService) {}

  @Post('resolve/:slug')
  @ApiOperation({ summary: 'Manually resolve a market by slug' })
  @ApiParam({ name: 'slug', description: 'Market slug to resolve' })
  @ApiResponse({ status: 200, description: 'Market resolved successfully' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  @ApiResponse({
    status: 400,
    description: 'Market not open or resolution failed',
  })
  async manualResolveMarket(@Param('slug') slug: string) {
    this.logger.log(`Manual resolution request for market: ${slug}`);
    return this.oracleService.manualResolveMarket(slug);
  }

  @Post('test-price')
  @ApiOperation({ summary: 'Test Hyperliquid price fetching' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        coinSymbol: {
          type: 'string',
          description: 'Coin symbol (e.g., BTC, ETH, SOL)',
          example: 'BTC',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: 'Date to fetch price data for',
          example: '2024-01-15T10:30:00.000Z',
        },
      },
      required: ['coinSymbol', 'endDate'],
    },
  })
  @ApiResponse({ status: 200, description: 'Price data fetched successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or price fetch failed',
  })
  async testFetchPrice(@Body() body: { coinSymbol: string; endDate: string }) {
    this.logger.log(
      `Price test request for ${body.coinSymbol} at ${body.endDate}`,
    );

    const endDate = new Date(body.endDate);
    if (isNaN(endDate.getTime())) {
      throw new Error(
        'Invalid endDate format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00.000Z)',
      );
    }

    return this.oracleService.testFetchPrice(body.coinSymbol, endDate);
  }
}
