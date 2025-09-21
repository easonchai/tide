import { ApiProperty } from '@nestjs/swagger';
import { MarketStatus } from './market.dto';

export class MarketResponseDTO {
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
    description: 'Total trading volume for this market',
    example: '1500000000000',
  })
  volume: bigint;

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

export class NFTPositionResponseDTO {
  @ApiProperty({
    description: 'Unique identifier for the NFT position',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'The market ID for the NFT position',
    example: 'clx1234567890abcdef',
  })
  marketId: string;

  @ApiProperty({
    description: 'The user ID for the NFT position',
    example: 'clx1234567890abcdef',
  })
  userId: string;

  @ApiProperty({
    description: 'The on chain NFT ID of the position',
    example: '42',
  })
  onChainId: string;

  @ApiProperty({
    description: 'The amount of the position',
    example: '100000000',
  })
  amount: bigint;

  @ApiProperty({
    description: 'The payout amount for the position',
    example: '100000000',
  })
  payout: bigint;

  @ApiProperty({
    description: 'The lower bound of the position',
    example: '100000000',
  })
  lowerBound: bigint;

  @ApiProperty({
    description: 'The upper bound of the position',
    example: '100000000',
  })
  upperBound: bigint;

  @ApiProperty({
    description: 'Date when the NFT position was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the NFT position was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when the NFT position was soft deleted',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  deletedAt: Date | null;

  @ApiProperty({
    description: 'The market associated with this position',
    type: MarketResponseDTO,
  })
  market?: MarketResponseDTO;

  @ApiProperty({
    description: 'The user associated with this position',
    type: 'object',
    properties: {
      id: { type: 'string' },
      address: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      deletedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  })
  user?: {
    id: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  };
}
