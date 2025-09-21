import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    description: 'User creation data',
    schema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The unique address of the user',
          example: '0x1234567890abcdef1234567890abcdef12345678',
        },
      },
      required: ['address'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        address: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Address already exists' })
  async createUser(@Body() createUserData: { address: string }): Promise<User> {
    return this.userService.createUser(createUserData);
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Get a user by address' })
  @ApiParam({
    name: 'address',
    description: 'User address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        address: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByAddress(
    @Param('address') address: string,
  ): Promise<User | null> {
    return this.userService.getUser({ address });
  }

  @Delete('address/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a user by address' })
  @ApiParam({
    name: 'address',
    description: 'User address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        address: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User already deleted' })
  async deleteUser(@Param('address') address: string): Promise<User> {
    return this.userService.deleteUser(address);
  }
}
