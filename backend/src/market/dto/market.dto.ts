import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  Matches,
  IsUrl,
  IsNumberString,
  IsEthereumAddress,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'The unique address of the market',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsEthereumAddress()
  address: string;

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
    description: 'Market fee in wei',
    example: '20000000000000000',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Fee must be a valid number string' })
  fee?: bigint;

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
    description: 'Market fee in wei',
    example: '20000000000000000',
    required: false,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Fee must be a valid number string' })
  fee?: bigint;

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
  @IsNotEmpty()
  onChainId: string;

  @ApiProperty({
    description: 'The amount of the position',
    example: '10000000',
  })
  @IsString()
  @IsNotEmpty()
  amount: bigint;

  @ApiProperty({
    description: 'The lower bound of the position',
    example: '10000000',
  })
  @IsString()
  @IsNotEmpty()
  lowerBound: bigint;

  @ApiProperty({
    description: 'The upper bound of the position',
    example: '10000000',
  })
  @IsString()
  @IsNotEmpty()
  upperBound: bigint;

  @ApiProperty({
    description: 'The payout amount for the position',
    example: '10000000',
    required: false,
  })
  @IsOptional()
  @IsString()
  payout?: bigint;
}

export class CloseNFTPositionDTO {
  @ApiProperty({
    description: 'The payout amount for the position',
    example: '10000000',
  })
  @IsString()
  @IsNotEmpty()
  payout: bigint;
}
