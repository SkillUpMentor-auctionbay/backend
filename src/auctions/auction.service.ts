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

@Injectable()
export class AuctionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
    private readonly bidsService: BidsService,
    private readonly fileUploadService: FileUploadService,
    private readonly auctionSchedulerService: AuctionSchedulerService,
  ) {}

  async createAuction(sellerId: string, createAuctionDto: CreateAuctionDto) {
    const { title, description, startingPrice, endTime, imageUrl } =
      createAuctionDto;

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

      await this.auctionSchedulerService.updateOrCreateAuctionEnd(
        auction.id,
        new Date(endTime),
      );

      return auction;
    } catch (error) {
      this.loggingService.logError('Failed to create auction', error, {
        sellerId,
        title,
      });
      throw error;
    }
  }

  async updateAuction(
    auctionId: string,
    sellerId: string,
    updateAuctionDto: UpdateAuctionDto,
  ) {
    const existingAuction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!existingAuction) {
      throw new NotFoundException('Auction not found');
    }

    if (existingAuction.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own auctions');
    }

    if (
      'startingPrice' in updateAuctionDto &&
      updateAuctionDto.startingPrice !== undefined
    ) {
      throw new BadRequestException(
        'Starting price cannot be updated after auction creation',
      );
    }

    if (
      updateAuctionDto.endTime &&
      new Date(updateAuctionDto.endTime) <= new Date()
    ) {
      throw new BadRequestException('End time must be in the future');
    }

    this.loggingService.logInfo('Updating auction', {
      auctionId,
      sellerId,
      updates: updateAuctionDto,
    });

    try {
      const isEndTimeUpdated = updateAuctionDto.endTime !== undefined;
      const endTimeChanged =
        isEndTimeUpdated &&
        existingAuction.endTime.getTime() !==
          new Date(updateAuctionDto.endTime).getTime();

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
        customMessage: endTimeChanged
          ? 'End time changed'
          : 'End time unchanged',
        endTime: existingAuction.endTime,
        newEndTime: endTimeChanged
          ? new Date(updateAuctionDto.endTime)
          : undefined,
      });

      // Only update the job if the endTime actually changed
      if (endTimeChanged) {
        this.loggingService.logInfo(
          'Updating auction end job due to endTime change',
          {
            auctionId,
            endTime: existingAuction.endTime,
            newEndTime: new Date(updateAuctionDto.endTime),
          },
        );

        await this.auctionSchedulerService.updateOrCreateAuctionEnd(
          auctionId,
          new Date(updateAuctionDto.endTime),
        );
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

  async getAuctionById(
    auctionId: string,
    userId?: string,
  ): Promise<DetailedAuctionDto> {
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
      bids: auction.bids.map((bid) => ({
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

  async placeBid(
    auctionId: string,
    bidderId: string,
    placeBidDto: PlaceBidDto,
  ): Promise<BidDto> {
    return this.bidsService.placeBid(auctionId, bidderId, placeBidDto);
  }

  async validateAuctionOwnership(auctionId: string, userId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true, sellerId: true },
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
      throw new ForbiddenException(
        'You can only delete images from your own auctions',
      );
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
      select: { title: true, imageUrl: true },
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
        this.loggingService.logInfo(
          'Deleted auction image during auction deletion',
          {
            auctionId,
            imageUrl: auction.imageUrl,
          },
        );
      }

      await this.prisma.auction.delete({
        where: { id: auctionId },
      });

      this.loggingService.logInfo('Auction deleted successfully', {
        auctionId,
        userId,
        title: auction.title,
      });

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
    userId?: string,
  ): Promise<AuctionListResponseDto> {
    const { filter, page = 1, limit = 500 } = queryDto;

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

    const where: any =
      filter === AuctionFilter.ALL ? {} : { id: { in: auctionIds } };

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
    return auctions.map((a) => a.id);
  }

  private async getBiddedAuctionIds(userId: string): Promise<string[]> {
    const now = new Date();

    const userBids = await this.prisma.bid.findMany({
      where: {
        bidderId: userId,
        auction: {
          endTime: {
            gt: now,
          },
        },
      },
      select: { auctionId: true },
      distinct: ['auctionId'],
    });
    return userBids.map((bid) => bid.auctionId);
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
      .filter((auction) => {
        const highestBid = calculateCurrentPrice(auction);
        const userBid = getUserBidAmount(auction, userId);
        return userBid && userBid >= highestBid;
      })
      .map((a) => a.id);
  }
}
