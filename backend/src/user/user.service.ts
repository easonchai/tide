import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(UserService.name);

  /**
   * Creates a new user in the database
   * @param {Prisma.UserCreateInput} data - User creation data
   * @returns {Promise<User>} The created user
   */
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    this.logger.log(`Creating user with address: ${data.address}`);
    try {
      const user = await this.prisma.user.create({ data });
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves a user by unique identifier
   * @param {Prisma.UserWhereUniqueInput} where - Unique user identifier (id or address)
   * @returns {Promise<User | null>} The user or null if not found
   */
  async getUser(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where,
    });

    return user;
  }

  /**
   * Performs a soft delete on a user by setting the deletedAt timestamp
   * @param {string} address - The address of the user to delete
   * @returns {Promise<User>} The soft-deleted user
   * @throws {PrismaClientKnownRequestError} If user is not found or already deleted
   */
  async deleteUser(address: string): Promise<User> {
    return this.prisma.user.update({
      where: {
        address,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
