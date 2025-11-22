import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { AuctionCardDto } from './dto/auction-card.dto';
import { DetailedAuctionDto } from './dto/detailed-auction.dto';
import { AuctionListResponseDto } from './dto/auction-list-response.dto';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { BidDto } from './dto/bid.dto';
import { AuctionQueryDto, AuctionFilter } from './dto/auction-query.dto';
import {
  calculateCurrentPrice,
  calculateAuctionStatus,
  getUserBidAmount,
} from './utils/auction-status.util';
import { BidsService } from './bids.service';
import {
  TestSetAuctionTimeDto,
  TestResetAuctionDto,
  TestBatchAuctionOperationDto,
  TestSimulateBiddingDto,
} from './dto/test-auction.dto';

@Injectable()
export class AuctionService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
    private bidsService: BidsService,
    private fileUploadService: FileUploadService,
    private auctionSchedulerService: AuctionSchedulerService,
  ) {}

  async createAuction(sellerId: string, createAuctionDto: CreateAuctionDto) {
    const { title, description, startingPrice, endTime, imageUrl } = createAuctionDto;

    if (new Date(endTime) <= new Date()) {
      throw new BadRequestException('End time must be in the future');
    }

    if (startingPrice <= 0) {
      throw new BadRequestException('Starting price must be positive');
    }

    this.loggingService.logInfo('Creating new auction', {
      sellerId,
      title,
      startingPrice,
      endTime,
    });

    try {
      const auction = await this.prisma.auction.create({
        data: {
          title,
          description,
          startingPrice,
          endTime: new Date(endTime),
          imageUrl,
          sellerId,
        },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              surname: true,
              profile_picture_url: true,
            },
          },
        },
      });

      this.loggingService.logInfo('Auction created successfully', {
        auctionId: auction.id,
        sellerId,
      });

      // Schedule job to process auction end at the specified time
      await this.auctionSchedulerService.scheduleAuctionEnd(auction.id, new Date(endTime));

      return auction;
    } catch (error) {
      this.loggingService.logError('Failed to create auction', error, {
        sellerId,
        title,
      });
      throw error;
    }
  }

  async updateAuction(auctionId: string, sellerId: string, updateAuctionDto: UpdateAuctionDto) {
    const existingAuction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!existingAuction) {
      throw new NotFoundException('Auction not found');
    }

    if (existingAuction.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own auctions');
    }

    if ('startingPrice' in updateAuctionDto && updateAuctionDto.startingPrice !== undefined) {
      throw new BadRequestException('Starting price cannot be updated after auction creation');
    }

    if (updateAuctionDto.endTime && new Date(updateAuctionDto.endTime) <= new Date()) {
      throw new BadRequestException('End time must be in the future');
    }

    this.loggingService.logInfo('Updating auction', {
      auctionId,
      sellerId,
      updates: updateAuctionDto,
    });

    try {
      const updatedAuction = await this.prisma.auction.update({
        where: { id: auctionId },
        data: updateAuctionDto,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              surname: true,
              profile_picture_url: true,
            },
          },
        },
      });

      this.loggingService.logInfo('Auction updated successfully', {
        auctionId,
        sellerId,
      });

      // If endTime was updated, reschedule the job
      if (updateAuctionDto.endTime) {
        await this.auctionSchedulerService.rescheduleAuctionEnd(auctionId, new Date(updateAuctionDto.endTime));
      }

      return updatedAuction;
    } catch (error) {
      this.loggingService.logError('Failed to update auction', error, {
        auctionId,
        sellerId,
      });
      throw error;
    }
  }

    
  async getAuctionById(auctionId: string, userId?: string): Promise<DetailedAuctionDto> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            surname: true,
            profile_picture_url: true,
          },
        },
        bids: {
          include: {
            bidder: {
              select: {
                id: true,
                name: true,
                surname: true,
                profile_picture_url: true,
              },
            },
          },
          orderBy: { amount: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const currentPrice = calculateCurrentPrice(auction);
    const status = calculateAuctionStatus(auction, userId);
    const myBid = userId ? getUserBidAmount(auction, userId) : undefined;

    return {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      imageUrl: auction.imageUrl,
      startingPrice: Number(auction.startingPrice),
      currentPrice,
      endTime: auction.endTime,
      status,
      myBid,
      bidCount: auction.bids.length,
      seller: {
        id: auction.seller.id,
        name: auction.seller.name,
        surname: auction.seller.surname,
        profilePictureUrl: auction.seller.profile_picture_url,
      },
      createdAt: auction.createdAt,
      bids: auction.bids.map(bid => ({
        id: bid.id,
        amount: Number(bid.amount),
        createdAt: bid.createdAt,
        bidder: {
          id: bid.bidder.id,
          name: bid.bidder.name,
          surname: bid.bidder.surname,
          profilePictureUrl: bid.bidder.profile_picture_url,
        },
      })),
    };
  }

  
  async placeBid(auctionId: string, bidderId: string, placeBidDto: PlaceBidDto): Promise<BidDto> {
    return this.bidsService.placeBid(auctionId, bidderId, placeBidDto);
  }

  async validateAuctionOwnership(auctionId: string, userId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true, sellerId: true }
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('You can only access your own auctions');
    }

    return auction;
  }

  async deleteAuctionImage(auctionId: string, userId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('You can only delete images from your own auctions');
    }

    if (!auction.imageUrl) {
      throw new BadRequestException('No image to delete');
    }

    this.loggingService.logInfo('Deleting auction image', {
      auctionId,
      userId,
      imageUrl: auction.imageUrl,
    });

    try {
      await this.fileUploadService.deleteAuctionImage(auction.imageUrl);

      await this.prisma.auction.update({
        where: { id: auctionId },
        data: { imageUrl: null },
      });

      this.loggingService.logInfo('Auction image deleted successfully', {
        auctionId,
        userId,
        imageUrl: auction.imageUrl,
      });
    } catch (error) {
      this.loggingService.logError('Failed to delete auction image', error, {
        auctionId,
        userId,
        imageUrl: auction.imageUrl,
      });
      throw error;
    }
  }

  async deleteAuction(auctionId: string, userId: string): Promise<void> {
    await this.validateAuctionOwnership(auctionId, userId);

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { title: true, imageUrl: true }
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    this.loggingService.logInfo('Deleting auction', {
      auctionId,
      userId,
      title: auction.title,
    });

    try {
      if (auction.imageUrl) {
        await this.fileUploadService.deleteAuctionImage(auction.imageUrl);
        this.loggingService.logInfo('Deleted auction image during auction deletion', {
          auctionId,
          imageUrl: auction.imageUrl,
        });
      }

      await this.prisma.auction.delete({
        where: { id: auctionId },
      });

      this.loggingService.logInfo('Auction deleted successfully', {
        auctionId,
        userId,
        title: auction.title,
      });

      // Cancel scheduled job when auction is deleted
      await this.auctionSchedulerService.cancelAuctionEnd(auctionId);
    } catch (error) {
      this.loggingService.logError('Failed to delete auction', error, {
        auctionId,
        userId,
        title: auction.title,
      });
      throw error;
    }
  }

  async getAuctions(
    queryDto: AuctionQueryDto,
    userId?: string
  ): Promise<AuctionListResponseDto> {
    const {
      filter,
      page = 1,
      limit = 500,
    } = queryDto;

    const skip = (page - 1) * limit;
    let auctionIds: string[] = [];

    switch (filter) {
      case AuctionFilter.ALL:
        break;

      case AuctionFilter.OWN:
        if (!userId) {
          throw new BadRequestException('User ID required for OWN filter');
        }
        auctionIds = await this.getOwnAuctionIds(userId);
        break;

      case AuctionFilter.BID:
        if (!userId) {
          throw new BadRequestException('User ID required for BID filter');
        }
        auctionIds = await this.getBiddedAuctionIds(userId);
        break;

      case AuctionFilter.WON:
        if (!userId) {
          throw new BadRequestException('User ID required for WON filter');
        }
        auctionIds = await this.getWonAuctionIds(userId);
        break;
    }

    const where: any = filter === AuctionFilter.ALL ? {} : { id: { in: auctionIds } };

    if (filter === AuctionFilter.BID) {
      const now = new Date();
      if (where.id) {
        where.endTime = { gt: now };
      }
    }
    if (filter !== AuctionFilter.ALL && auctionIds.length === 0) {
      return {
        auctions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const auctions = await this.prisma.auction.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        startingPrice: true,
        imageUrl: true,
        endTime: true,
        sellerId: true,
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
      },
      orderBy: { endTime: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.auction.count({ where });

    const auctionCards = auctions.map((auction) => {
      const currentPrice = calculateCurrentPrice(auction);
      const status = calculateAuctionStatus(auction, userId);

      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startingPrice: Number(auction.startingPrice),
        currentPrice,
        imageUrl: auction.imageUrl,
        endTime: auction.endTime,
        status,
        sellerId: auction.sellerId,
      } as AuctionCardDto;
    });

    return {
      auctions: auctionCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getOwnAuctionIds(userId: string): Promise<string[]> {
    const auctions = await this.prisma.auction.findMany({
      where: { sellerId: userId },
      select: { id: true },
    });
    return auctions.map(a => a.id);
  }

  private async getBiddedAuctionIds(userId: string): Promise<string[]> {
    const now = new Date();

    const userBids = await this.prisma.bid.findMany({
      where: {
        bidderId: userId,
        auction: {
          endTime: {
            gt: now
          }
        }
      },
      select: { auctionId: true },
      distinct: ['auctionId'],
    });
    return userBids.map(bid => bid.auctionId);
  }

  private async getWonAuctionIds(userId: string): Promise<string[]> {
    const now = new Date();

    const userBidAuctions = await this.prisma.auction.findMany({
      where: {
        endTime: { lte: now },
        bids: {
          some: { bidderId: userId },
        },
      },
      include: {
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
      },
    });

    return userBidAuctions
      .filter(auction => {
        const highestBid = calculateCurrentPrice(auction);
        const userBid = getUserBidAmount(auction, userId);
        return userBid && userBid >= highestBid;
      })
      .map(a => a.id);
  }

  // ==================== TEST METHODS ====================
  // These methods are for testing purposes only and should not be used in production

  async testSetAuctionTime(auctionId: string, setTimeDto: TestSetAuctionTimeDto) {
    const { endTime, bypassValidation = false } = setTimeDto;

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const newEndTime = new Date(endTime);

    if (!bypassValidation && newEndTime <= new Date()) {
      throw new BadRequestException('End time must be in the future (unless bypassing validation)');
    }

    const updateData: any = {
      endTime: newEndTime,
      updatedAt: new Date(),
    };

    // Note: status is calculated dynamically in this system based on endTime and bids
    // Status parameter is ignored for now

    const updatedAuction = await this.prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
    });

    await this.loggingService.logInfo('TEST: Auction time updated and processing status reset', {
      auctionId,
      endTime: newEndTime,
    });

    return {
      success: true,
      auctionId,
      oldEndTime: auction.endTime,
      newEndTime: updatedAuction.endTime,
    };
  }

  async testResetAuction(auctionId: string, resetDto: TestResetAuctionDto) {
    const {
      currentPrice,
      endTime,
      status,
      minutesFromNow,
      hoursFromNow,
      daysFromNow,
      clearBids = false,
      bypassValidation = true,
    } = resetDto;

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    // Calculate new end time if relative offsets are provided
    let newEndTime = auction.endTime;
    if (minutesFromNow !== undefined || hoursFromNow !== undefined || daysFromNow !== undefined) {
      const now = new Date();
      const totalMinutes =
        (minutesFromNow || 0) +
        ((hoursFromNow || 0) * 60) +
        ((daysFromNow || 0) * 24 * 60);
      newEndTime = new Date(now.getTime() + totalMinutes * 60 * 1000);
    } else if (endTime) {
      newEndTime = new Date(endTime);
    }

    if (!bypassValidation && newEndTime <= new Date()) {
      throw new BadRequestException('End time must be in the future (unless bypassing validation)');
    }

    // Clear bids if requested
    if (clearBids) {
      await this.prisma.bid.deleteMany({
        where: { auctionId },
      });

      // Create a new bid with the specified current price
      await this.prisma.bid.create({
        data: {
          amount: currentPrice,
          auctionId,
          bidderId: 'test-system-user', // System user for testing
          createdAt: new Date(),
        },
      });
    }

    const updateData: any = {
      endTime: newEndTime,
      updatedAt: new Date(),
    };

    const updatedAuction = await this.prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
    });

    await this.loggingService.logInfo('TEST: Auction reset completed', {
      auctionId,
      currentPrice,
      endTime: newEndTime,
      updates: {
        bidsCleared: clearBids,
      },
    });

    return {
      success: true,
      auctionId,
      currentPrice,
      oldEndTime: auction.endTime,
      newEndTime: updatedAuction.endTime,
      bidsCleared: clearBids,
    };
  }

  async testBatchOperation(batchDto: TestBatchAuctionOperationDto) {
    const {
      auctionIds,
      minutesOffset = 0,
      hoursOffset = 0,
      daysOffset = 0,
      status,
      priceMultiplier,
      bypassValidation = true,
    } = batchDto;

    const results = [];
    const totalOffsetMinutes = minutesOffset + (hoursOffset * 60) + (daysOffset * 24 * 60);

    for (const auctionId of auctionIds) {
      try {
        const auction = await this.prisma.auction.findUnique({
          where: { id: auctionId },
          include: { bids: true },
        });

        if (!auction) {
          results.push({ auctionId, success: false, error: 'Auction not found' });
          continue;
        }

        const updateData: any = { updatedAt: new Date() };

        // Update end time if offset is provided
        if (totalOffsetMinutes !== 0) {
          const newEndTime = new Date(auction.endTime.getTime() + totalOffsetMinutes * 60 * 1000);
          if (!bypassValidation && newEndTime <= new Date()) {
            results.push({ auctionId, success: false, error: 'New end time would be in the past' });
            continue;
          }
          updateData.endTime = newEndTime;
        }

        // Note: status is calculated dynamically in this system
        // Status parameter is ignored for now

        // Update price if multiplier is provided
        if (priceMultiplier) {
          const currentPrice = calculateCurrentPrice(auction);
          const newPrice = currentPrice * priceMultiplier;

          // Create a new bid with the multiplied price
          await this.prisma.bid.create({
            data: {
              amount: newPrice,
              auctionId,
              bidderId: 'test-system-user',
              createdAt: new Date(),
            },
          });
        }

        const updatedAuction = await this.prisma.auction.update({
          where: { id: auctionId },
          data: updateData,
          include: { bids: true },
        });

        results.push({
          auctionId,
          success: true,
          endTime: updatedAuction.endTime,
          currentPrice: calculateCurrentPrice(updatedAuction),
        });
      } catch (error) {
        results.push({
          auctionId,
          success: false,
          error: error.message,
        });
      }
    }

    await this.loggingService.logInfo('TEST: Batch operation completed', {
      auctionIds,
      updates: {
        totalOffsetMinutes,
        priceMultiplier,
        successfulUpdates: results.filter(r => r.success).length,
        failedUpdates: results.filter(r => !r.success).length,
      },
    });

    return {
      success: true,
      totalAuctions: auctionIds.length,
      successfulUpdates: results.filter(r => r.success).length,
      failedUpdates: results.filter(r => !r.success).length,
      results,
    };
  }

  async testSimulateBidding(auctionId: string, biddingDto: TestSimulateBiddingDto) {
    const {
      numberOfBids = 5,
      startAmount,
      maxAmount,
      bidInterval = 1,
      userIds,
      sequential = true,
    } = biddingDto;

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const auctionStatus = calculateAuctionStatus(auction);
    if (auctionStatus === 'DONE') {
      throw new BadRequestException('Auction has ended');
    }

    const currentPrice = calculateCurrentPrice(auction);
    const startBidAmount = startAmount || currentPrice + 10;
    const maxBidAmount = maxAmount || startBidAmount + (numberOfBids * 10);

    const bids = [];
    let currentBid = startBidAmount;

    for (let i = 0; i < numberOfBids; i++) {
      const bidAmount = sequential
        ? Math.min(currentBid, maxBidAmount)
        : startBidAmount + Math.random() * (maxBidAmount - startBidAmount);

      const roundedAmount = Math.round(bidAmount * 100) / 100; // Round to 2 decimal places

      // Create a mock user ID if none provided
      const bidderId = userIds?.[i % userIds.length] || `test-user-${i}`;

      const bid = await this.prisma.bid.create({
        data: {
          amount: roundedAmount,
          auctionId,
          bidderId,
          createdAt: new Date(),
        },
      });

      bids.push({
        id: bid.id,
        amount: roundedAmount,
        bidderId,
        createdAt: bid.createdAt,
      });

      currentBid = roundedAmount + 10; // Increment for next sequential bid

      // Wait for interval if specified
      if (bidInterval > 0 && i < numberOfBids - 1) {
        await new Promise(resolve => setTimeout(resolve, bidInterval * 1000));
      }
    }

    await this.loggingService.logInfo('TEST: Bidding simulation completed', {
      auctionId,
      bidCount: bids.length,
      updates: {
        startAmount: startBidAmount,
        maxAmount: maxBidAmount,
        finalBid: bids[bids.length - 1]?.amount,
      },
    });

    return {
      success: true,
      auctionId,
      bidsCreated: bids.length,
      finalPrice: bids[bids.length - 1]?.amount || calculateCurrentPrice(auction),
      bids,
    };
  }

  async testCreateSampleAuctions(userId: string, count: number, hoursSpread: number) {
    const auctions = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const startPrice = Math.floor(Math.random() * 500) + 50;
      const endTime = new Date(now.getTime() + Math.random() * hoursSpread * 60 * 60 * 1000);

      const auction = await this.prisma.auction.create({
        data: {
          title: `Test Auction ${i + 1}`,
          description: `This is a sample auction for testing purposes. Auction ${i + 1}`,
          startingPrice: startPrice,
          endTime,
          sellerId: userId,
        },
      });

      // Create an initial bid to set the starting price as current price
      await this.prisma.bid.create({
        data: {
          amount: startPrice,
          auctionId: auction.id,
          bidderId: 'test-system-user',
          createdAt: new Date(),
        },
      });

      auctions.push({
        id: auction.id,
        title: auction.title,
        startingPrice: Number(auction.startingPrice),
        currentPrice: startPrice, // Use the startPrice we just set
        endTime: auction.endTime,
      });
    }

    await this.loggingService.logInfo('TEST: Sample auctions created', {
      sellerId: userId,
      updates: {
        auctionCount: auctions.length,
        hoursSpread,
      },
    });

    return {
      success: true,
      auctionsCreated: auctions.length,
      auctions,
    };
  }

  async testCleanup(olderThanHours: number, onlySample: boolean) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const whereClause: any = {
      createdAt: { lt: cutoffTime },
    };

    if (onlySample) {
      whereClause.title = { contains: 'test' };
    }

    // First, delete associated bids
    const auctionsToDelete = await this.prisma.auction.findMany({
      where: whereClause,
      select: { id: true },
    });

    await this.prisma.bid.deleteMany({
      where: {
        auctionId: { in: auctionsToDelete.map(a => a.id) },
      },
    });

    // Then delete the auctions
    const deletedAuctions = await this.prisma.auction.deleteMany({
      where: whereClause,
    });

    await this.loggingService.logInfo('TEST: Cleanup completed', {
      updates: {
        olderThanHours,
        onlySample,
        auctionsDeleted: deletedAuctions.count,
        bidsDeleted: auctionsToDelete.length,
      },
    });

    return {
      success: true,
      auctionsDeleted: deletedAuctions.count,
      olderThanHours,
      onlySample,
    };
  }
}