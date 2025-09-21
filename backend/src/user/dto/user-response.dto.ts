import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'clx1234567890abcdef',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The unique address of the user',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @Expose()
  address: string;

  @ApiProperty({
    description: 'Date when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the user was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when the user was soft deleted',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  deletedAt: Date | null;
}
