import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  Matches,
  Length,
  IsUrl,
  IsNumberString,
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
    minLength: 42,
    maxLength: 42,
  })
  @IsString()
  @IsNotEmpty()
  @Length(42, 42, { message: 'Address must be exactly 42 characters long' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message:
      'Address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)',
  })
  address: string;

  @ApiProperty({
    description: 'Summary of the market',
    example: 'This market predicts Bitcoin price movement',
    required: false,
  })
  @IsOptional()
  @IsString()
  marketSummary?: string;

  @ApiProperty({
    description: 'Market rules and conditions',
    example: 'Market resolves based on CoinGecko price at end of 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  rules?: string;

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
    description: 'Summary of the market',
    example: 'This market predicts Bitcoin price movement',
    required: false,
  })
  @IsOptional()
  @IsString()
  marketSummary?: string;

  @ApiProperty({
    description: 'Market rules and conditions',
    example: 'Market resolves based on CoinGecko price at end of 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  rules?: string;

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
