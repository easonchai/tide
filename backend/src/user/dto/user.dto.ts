import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'The unique address of the user',
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
}
