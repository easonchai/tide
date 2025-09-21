import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  Matches,
  IsUrl,
  IsEthereumAddress,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum MarketStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RESOLVED = 'RESOLVED',
  PAUSED = 'PAUSED',
}

export class CreateMarketDTO {
  @ApiProperty({
    description: 'The market question',
    example: 'Will Bitcoin reach $100,000 by end of 2024?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'Token pair name for hyperliquid api',
    example: '@107',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'On-chain market ID',
    example: '1',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => BigInt(value))
  onChainId?: bigint;

  @ApiProperty({
    description: 'Market tags',
    example: ['crypto', 'bitcoin', 'price-prediction'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Market profile image URL',
    example: 'https://example.com/image.png',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Profile image must be a valid URL' })
  profileImage?: string;

  @ApiProperty({
    description: 'Unique slug for the market',
    example: 'bitcoin-100k-2024',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({
    description: 'Market end date',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;
}

export class UpdateMarketDTO {
  @ApiProperty({
    description: 'The market question',
    example: 'Will Bitcoin reach $100,000 by end of 2024?',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  question?: string;

  @ApiProperty({
    description: 'Market status',
    enum: MarketStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MarketStatus, {
    message: 'Status must be one of: OPEN, CLOSED, RESOLVED, PAUSED',
  })
  status?: MarketStatus;

  @ApiProperty({
    description: 'On-chain market ID',
    example: '1',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => BigInt(value))
  onChainId?: bigint;

  @ApiProperty({
    description: 'Market tags',
    example: ['crypto', 'bitcoin', 'price-prediction'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Market profile image URL',
    example: 'https://example.com/image.png',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Profile image must be a valid URL' })
  profileImage?: string;

  @ApiProperty({
    description: 'Market end date',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;
}

export class CreateNFTPositionDTO {
  @ApiProperty({
    description: 'The market slug for the NFT position',
    example: 'bitcoin-100k-2024',
  })
  @IsString()
  @IsNotEmpty()
  marketSlug: string;

  @ApiProperty({
    description: 'The user address for the NFT position',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'The on chain NFT ID of the position',
    example: '42',
  })
  @IsString()
  @IsOptional()
  onChainId: string;

  @ApiProperty({
    description: 'The amount of the position',
    example: '10000000',
  })
  @IsNotEmpty()
  @Transform(({ value }) => BigInt(value))
  amount: bigint;

  @ApiProperty({
    description: 'The lower bound of the position',
    example: '10000000',
  })
  @IsNotEmpty()
  @Transform(({ value }) => BigInt(value))
  lowerBound: bigint;

  @ApiProperty({
    description: 'The upper bound of the position',
    example: '10000000',
  })
  @IsNotEmpty()
  @Transform(({ value }) => BigInt(value))
  upperBound: bigint;

  @ApiProperty({
    description: 'The payout amount for the position',
    example: '10000000',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => BigInt(value))
  payout?: bigint;
}

export class CloseNFTPositionDTO {
  @ApiProperty({
    description: 'The payout amount for the position',
    example: '10000000',
  })
  @IsNotEmpty()
  @Transform(({ value }) => BigInt(value))
  payout: bigint;
}
