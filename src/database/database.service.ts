import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.prisma.healthCheck();
    } catch (error) {
      this.logger.error('Database connection test failed', error);
      return false;
    }
  }

  /**
   * Test basic user CRUD operations
   */
  async testUserCRUD(): Promise<{ success: boolean; message: string }> {
    try {
      const testUsername = `test_user_${Date.now()}`;

      // Create
      const createdUser = await this.prisma.user.create({
        data: {
          username: testUsername,
          password: 'hashed_test_password',
        },
      });

      // Read
      const foundUser = await this.prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      if (!foundUser) {
        throw new Error('Failed to retrieve created user');
      }

      // Update
      const updatedUser = await this.prisma.user.update({
        where: { id: createdUser.id },
        data: { username: `${testUsername}_updated` },
      });

      if (updatedUser.username !== `${testUsername}_updated`) {
        throw new Error('Failed to update user');
      }

      // Delete
      await this.prisma.user.delete({
        where: { id: createdUser.id },
      });

      const deletedUser = await this.prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      if (deletedUser) {
        throw new Error('Failed to delete user');
      }

      return {
        success: true,
        message: 'User CRUD operations completed successfully'
      };

    } catch (error) {
      this.logger.error('User CRUD test failed', error);
      return {
        success: false,
        message: `User CRUD test failed: ${error.message}`
      };
    }
  }

  /**
   * Test auction and bid relationships
   */
  async testAuctionAndBidCRUD(): Promise<{ success: boolean; message: string }> {
    try {
      // Create test users
      const seller = await this.prisma.user.create({
        data: {
          username: `seller_${Date.now()}`,
          password: 'hashed_seller_password',
        },
      });

      const bidder = await this.prisma.user.create({
        data: {
          username: `bidder_${Date.now()}`,
          password: 'hashed_bidder_password',
        },
      });

      // Create auction
      const auction = await this.prisma.auction.create({
        data: {
          title: 'Test Auction',
          description: 'Test auction description',
          startingPrice: 100.00,
          currentBid: null,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          status: 'ACTIVE',
          sellerId: seller.id,
        },
      });

      // Create bid
      const bid = await this.prisma.bid.create({
        data: {
          amount: 150.00,
          auctionId: auction.id,
          bidderId: bidder.id,
        },
      });

      // Test relationships
      const auctionWithBids = await this.prisma.auction.findUnique({
        where: { id: auction.id },
        include: { bids: true, seller: true },
      });

      if (!auctionWithBids || auctionWithBids.bids.length !== 1) {
        throw new Error('Auction relationships not working properly');
      }

      // Cleanup
      await this.prisma.bid.delete({ where: { id: bid.id } });
      await this.prisma.auction.delete({ where: { id: auction.id } });
      await this.prisma.user.deleteMany({
        where: { id: { in: [seller.id, bidder.id] } },
      });

      return {
        success: true,
        message: 'Auction and Bid CRUD operations completed successfully'
      };

    } catch (error) {
      this.logger.error('Auction and Bid CRUD test failed', error);
      return {
        success: false,
        message: `Auction and Bid CRUD test failed: ${error.message}`
      };
    }
  }
}