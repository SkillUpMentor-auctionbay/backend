import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { BidDto } from './dto/bid.dto';
import {
  calculateCurrentPrice,
  isValidBidAmount,
  isAuctionActive,
} from './utils/auction-status.util';
import { mapUserToBidderDto } from './utils/user-mapping.util';

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
  ) {}

  async placeBid(auctionId: string, bidderId: string, placeBidDto: PlaceBidDto): Promise<BidDto> {
    const { amount } = placeBidDto;

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          select: { amount: true, bidderId: true },
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (!isAuctionActive(auction.endTime)) {
      throw new BadRequestException('Auction has ended');
    }

    if (auction.sellerId === bidderId) {
      throw new ForbiddenException('You cannot bid on your own auction');
    }

    const currentPrice = calculateCurrentPrice(auction);

    if (!isValidBidAmount(amount, currentPrice)) {
      throw new BadRequestException(
        `Bid must be higher than current price (${currentPrice})`
      );
    }

    this.loggingService.logInfo('Placing bid', {
      auctionId,
      bidderId,
      amount,
      currentPrice,
    });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const currentAuction = await tx.auction.findUnique({
          where: { id: auctionId },
          include: {
            bids: {
              select: { amount: true, bidderId: true },
              orderBy: { amount: 'desc' },
              take: 1,
            },
          },
        });

        if (!currentAuction) {
          throw new NotFoundException('Auction not found');
        }

        if (!isAuctionActive(currentAuction.endTime)) {
          throw new BadRequestException('Auction has ended');
        }

        const latestCurrentPrice = calculateCurrentPrice(currentAuction);

        if (!isValidBidAmount(amount, latestCurrentPrice)) {
          throw new BadRequestException(
            `Bid must be higher than current price (${latestCurrentPrice})`
          );
        }

        const bid = await tx.bid.upsert({
          where: {
            auctionId_bidderId: {
              auctionId,
              bidderId,
            },
          },
          update: {
            amount,
          },
          create: {
            amount,
            auctionId,
            bidderId,
          },
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
        });

        return bid;
      });

      this.loggingService.logInfo('Bid placed successfully', {
        auctionId,
        bidderId,
        bidId: result.id,
        amount,
      });

      return {
        id: result.id,
        amount: Number(result.amount),
        createdAt: result.createdAt,
        bidder: mapUserToBidderDto(result.bidder),
      };
    } catch (error) {
      this.loggingService.logError('Failed to place bid', error, {
        auctionId,
        bidderId,
        amount,
      });
      throw error;
    }
  }

  async getBidHistory(auctionId: string): Promise<BidDto[]> {
    const bids = await this.prisma.bid.findMany({
      where: { auctionId },
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
    });

    return bids.map(bid => ({
      id: bid.id,
      amount: Number(bid.amount),
      createdAt: bid.createdAt,
      bidder: mapUserToBidderDto(bid.bidder),
    }));
  }

  async getUserBids(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where: { bidderId: userId },
        include: {
          auction: {
            select: {
              id: true,
              title: true,
              endTime: true,
              seller: {
                select: { name: true, surname: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bid.count({
        where: { bidderId: userId },
      }),
    ]);

    return {
      bids: bids.map(bid => ({
        id: bid.id,
        amount: Number(bid.amount),
        createdAt: bid.createdAt,
        auction: bid.auction,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }
}