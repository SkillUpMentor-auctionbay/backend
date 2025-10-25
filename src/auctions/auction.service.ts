import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { AuctionCardDto } from './dto/auction-card.dto';
import { DetailedAuctionDto } from './dto/detailed-auction.dto';
import { AuctionListResponseDto } from './dto/auction-list-response.dto';
import { BidDto } from './dto/bid.dto';
import {
  calculateCurrentPrice,
  calculateAuctionStatus,
  getUserBidAmount,
  AuctionStatus,
} from './utils/auction-status.util';
import { createSellerName } from './utils/user-mapping.util';
import { BidsService } from './bids.service';

@Injectable()
export class AuctionService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
    private bidsService: BidsService,
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

    const bidCount = await this.prisma.bid.count({
      where: { auctionId },
    });

    if (bidCount > 0) {
      throw new BadRequestException('Cannot update auction with existing bids');
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

      return updatedAuction;
    } catch (error) {
      this.loggingService.logError('Failed to update auction', error, {
        auctionId,
        sellerId,
      });
      throw error;
    }
  }

    async getActiveAuctions(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sortBy: string = 'endTime',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<AuctionListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = {
      endTime: { gt: new Date() },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const auctions = await this.prisma.auction.findMany({
      where,
      include: {
        seller: { select: { name: true, surname: true } },
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
        _count: { select: { bids: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    let filteredAuctions = auctions;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredAuctions = auctions.filter(auction => {
        const currentPrice = calculateCurrentPrice(auction);
        if (minPrice !== undefined && currentPrice < minPrice) return false;
        if (maxPrice !== undefined && currentPrice > maxPrice) return false;
        return true;
      });
    }

    const total = await this.prisma.auction.count({ where });

    const auctionCards = filteredAuctions.map(auction => {
      const currentPrice = calculateCurrentPrice(auction);
      const status = calculateAuctionStatus(auction, userId);
      const myBid = userId ? getUserBidAmount(auction, userId) : undefined;

      return {
        id: auction.id,
        title: auction.title,
        currentPrice,
        endTime: auction.endTime,
        status,
        myBid,
        bidCount: auction._count.bids,
        sellerName: createSellerName(auction.seller),
      } as AuctionCardDto;
    });

    const finalTotal = (minPrice !== undefined || maxPrice !== undefined)
      ? filteredAuctions.length
      : total;

    return {
      auctions: auctionCards,
      page,
      limit,
      total: finalTotal,
      totalPages: Math.ceil(finalTotal / limit),
      hasNext: page * limit < finalTotal,
      hasPrevious: page > 1,
    };
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

  async getUserAuctions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    includeEnded: boolean = false
  ): Promise<AuctionListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = { sellerId: userId };

    if (!includeEnded) {
      where.endTime = { gt: new Date() };
    }

    const auctions = await this.prisma.auction.findMany({
      where,
      include: {
        seller: { select: { name: true, surname: true } },
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
        _count: { select: { bids: true } },
      },
      orderBy: { endTime: 'asc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.auction.count({ where });

    const auctionCards = auctions.map(auction => {
      const currentPrice = calculateCurrentPrice(auction);
      const status = calculateAuctionStatus(auction, userId);

      return {
        id: auction.id,
        title: auction.title,
        currentPrice,
        endTime: auction.endTime,
        status,
        bidCount: auction._count.bids,
        sellerName: createSellerName(auction.seller),
      } as AuctionCardDto;
    });

    return {
      auctions: auctionCards,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async getUserBiddedAuctions(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<AuctionListResponseDto> {
    const skip = (page - 1) * limit;

    // Get distinct auctions where user has bid
    const auctions = await this.prisma.auction.findMany({
      where: {
        bids: {
          some: { bidderId: userId },
        },
      },
      include: {
        seller: { select: { name: true, surname: true } },
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
        _count: { select: { bids: true } },
      },
      orderBy: { endTime: 'asc' },
      skip,
      take: limit,
      distinct: ['id'],
    });

    const total = await this.prisma.auction.count({
      where: {
        bids: {
          some: { bidderId: userId },
        },
      },
    });

    const auctionCards = auctions.map(auction => {
      const currentPrice = calculateCurrentPrice(auction);
      const status = calculateAuctionStatus(auction, userId);
      const myBid = getUserBidAmount(auction, userId);

      return {
        id: auction.id,
        title: auction.title,
        currentPrice,
        endTime: auction.endTime,
        status,
        myBid,
        bidCount: auction._count.bids,
        sellerName: createSellerName(auction.seller),
      } as AuctionCardDto;
    });

    return {
      auctions: auctionCards,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async getUserWonAuctions(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<AuctionListResponseDto> {
    const skip = (page - 1) * limit;

    // Get auctions that have ended and where user has the highest bid
    const auctions = await this.prisma.auction.findMany({
      where: {
        endTime: { lt: new Date() }, // Ended auctions
        bids: {
          some: { bidderId: userId },
        },
      },
      include: {
        seller: { select: { name: true, surname: true } },
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
        },
        _count: { select: { bids: true } },
      },
      orderBy: { endTime: 'desc' },
      skip,
      take: limit,
    });

    // Filter to only include auctions where user won (has highest bid)
    const wonAuctions = auctions.filter(auction => {
      const highestBid = calculateCurrentPrice(auction);
      const userBid = getUserBidAmount(auction, userId);
      return userBid && userBid >= highestBid;
    });

    const total = wonAuctions.length;

    const auctionCards = wonAuctions.map(auction => {
      const currentPrice = calculateCurrentPrice(auction);

      return {
        id: auction.id,
        title: auction.title,
        currentPrice,
        endTime: auction.endTime,
        status: 'DONE' as AuctionStatus,
        myBid: getUserBidAmount(auction, userId),
        bidCount: auction._count.bids,
        sellerName: createSellerName(auction.seller),
      } as AuctionCardDto;
    });

    return {
      auctions: auctionCards,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async placeBid(auctionId: string, bidderId: string, placeBidDto: PlaceBidDto): Promise<BidDto> {
    return this.bidsService.placeBid(auctionId, bidderId, placeBidDto);
  }
}