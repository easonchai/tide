import { ApiProperty } from '@nestjs/swagger';
import { MarketStatus } from './market.dto';

export class MarketResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the market',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The market question',
    example: 'Will Bitcoin reach $100,000 by end of 2024?',
  })
  question: string;

  @ApiProperty({
    description: 'The unique address of the market',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  address: string;

  @ApiProperty({
    description: 'Market status',
    enum: MarketStatus,
    example: MarketStatus.OPEN,
  })
  status: MarketStatus;

  @ApiProperty({
    description: 'Summary of the market',
    example: 'This market predicts Bitcoin price movement',
    nullable: true,
  })
  marketSummary: string | null;

  @ApiProperty({
    description: 'Market rules and conditions',
    example: 'Market resolves based on CoinGecko price at end of 2024',
    nullable: true,
  })
  rules: string | null;

  @ApiProperty({
    description: 'Market tags',
    example: ['crypto', 'bitcoin', 'price-prediction'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Market profile image URL',
    example: 'https://example.com/image.png',
    nullable: true,
  })
  profileImage: string | null;

  @ApiProperty({
    description: 'Unique slug for the market',
    example: 'bitcoin-100k-2024',
  })
  slug: string;

  @ApiProperty({
    description: 'Market fee in wei',
    example: '20000000000000000',
  })
  fee: bigint;

  @ApiProperty({
    description: 'Market end date',
    example: '2024-12-31T23:59:59Z',
    nullable: true,
  })
  endDate: Date | null;

  @ApiProperty({
    description: 'Date when the market was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the market was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when the market was soft deleted',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  deletedAt: Date | null;

  @ApiProperty({
    description: 'Date when the market was resolved',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  resolvedAt: Date | null;
}
