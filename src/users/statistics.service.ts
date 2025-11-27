import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { UserStatisticsDto } from './dto/user-statistics.dto';
import {
  calculateCurrentPrice,
  calculateAuctionStatus,
  AuctionWithBids,
} from '../auctions/utils/auction-status.util';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
  ) {}

  async getUserStatistics(userId: string): Promise<UserStatisticsDto> {
    this.loggingService.logInfo('Fetching user statistics', { userId });

    try {
      const userAuctions = await this.prisma.auction.findMany({
        where: { sellerId: userId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
          },
        },
      });

      const userBids = await this.prisma.bid.findMany({
        where: { bidderId: userId },
        include: {
          auction: {
            include: {
              bids: {
                orderBy: { amount: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      const statistics = await this.calculateStatistics(
        userAuctions,
        userBids,
        userId,
      );

      this.loggingService.logInfo('User statistics calculated successfully', {
        userId,
      });

      return statistics;
    } catch (error) {
      this.loggingService.logError('Failed to fetch user statistics', error, {
        userId,
      });
      throw error;
    }
  }

  private async calculateStatistics(
    userAuctions: any[],
    userBids: any[],
    userId: string,
  ): Promise<UserStatisticsDto> {
    const now = new Date();

    const transformedAuctions: AuctionWithBids[] = userAuctions.map(
      (auction) => ({
        id: auction.id,
        endTime: auction.endTime,
        startingPrice: auction.startingPrice,
        bids: auction.bids.map((bid: any) => ({
          amount: bid.amount,
          bidderId: bid.bidderId,
        })),
      }),
    );

    const currentlyBiddingBids = userBids.filter((bid) => {
      const auction: AuctionWithBids = {
        id: bid.auction.id,
        endTime: bid.auction.endTime,
        startingPrice: bid.auction.startingPrice,
        bids: bid.auction.bids.map((b: any) => ({
          amount: b.amount,
          bidderId: b.bidderId,
        })),
      };
      const auctionStatus = calculateAuctionStatus(auction, bid.bidderId);
      return auctionStatus === 'IN_PROGRESS' || auctionStatus === 'WINNING';
    });

    const currentlyWinningBids = userBids.filter((bid) => {
      const auction: AuctionWithBids = {
        id: bid.auction.id,
        endTime: bid.auction.endTime,
        startingPrice: bid.auction.startingPrice,
        bids: bid.auction.bids.map((b: any) => ({
          amount: b.amount,
          bidderId: b.bidderId,
        })),
      };
      const auctionStatus = calculateAuctionStatus(auction, bid.bidderId);
      return auctionStatus === 'WINNING';
    });

    const totalEarnings = transformedAuctions.reduce((sum, auction) => {
      if (auction.endTime <= now && auction.bids.length > 0) {
        const currentPrice = calculateCurrentPrice(auction);
        return sum + currentPrice;
      }
      return sum;
    }, 0);

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalPostedAuctions: userAuctions.length,
      currentlyBidding: currentlyBiddingBids.length,
      currentlyWinning: currentlyWinningBids.length,
    };
  }

  async getUserStatisticsOptimized(userId: string): Promise<UserStatisticsDto> {
    this.loggingService.logInfo('Fetching user statistics (optimized)', {
      userId,
    });
    const now = new Date();

    try {
      const totalPostedAuctions = await this.prisma.auction.count({
        where: { sellerId: userId },
      });

      const completedAuctions = await this.prisma.auction.findMany({
        where: {
          sellerId: userId,
          endTime: { lte: new Date() },
        },
        include: {
          bids: { orderBy: { amount: 'desc' } },
        },
      });

      const sellerEarnings = completedAuctions.reduce((sum, auction) => {
        if (auction.bids.length > 0) {
          const currentPrice = calculateCurrentPrice({
            id: auction.id,
            endTime: auction.endTime,
            startingPrice: auction.startingPrice,
            bids: auction.bids.map((b: any) => ({
              amount: b.amount,
              bidderId: b.bidderId,
            })),
          });
          return sum + currentPrice;
        }
        return sum;
      }, 0);

      let totalSpent = 0;
      const wonAuctions = await this.prisma.auction.findMany({
        where: {
          endTime: { lte: now },
          bids: {
            some: {
              bidderId: userId,
            },
          },
        },
        include: { bids: { orderBy: { amount: 'desc' } } },
      });

      for (const auction of wonAuctions) {
        const auctionWithBids: AuctionWithBids = {
          id: auction.id,
          endTime: auction.endTime,
          startingPrice: auction.startingPrice,
          bids: auction.bids.map((b: any) => ({
            amount: b.amount,
            bidderId: b.bidderId,
          })),
        };

        const auctionStatus = calculateAuctionStatus(auctionWithBids, userId);
        if (auctionStatus === 'DONE') {
          const winningAmount = calculateCurrentPrice(auctionWithBids);
          totalSpent += winningAmount;
        }
      }

      const currentlyBidding = await this.prisma.bid.count({
        where: {
          bidderId: userId,
          auction: {
            endTime: { gt: new Date() },
          },
        },
      });

      const userBids = await this.prisma.bid.findMany({
        where: {
          bidderId: userId,
          auction: {
            endTime: { gt: new Date() },
          },
        },
        include: {
          auction: {
            include: {
              bids: { orderBy: { amount: 'desc' } },
            },
          },
        },
      });

      const currentlyWinning = userBids.filter((bid) => {
        const auction: AuctionWithBids = {
          id: bid.auction.id,
          endTime: bid.auction.endTime,
          startingPrice: bid.auction.startingPrice,
          bids: bid.auction.bids.map((b: any) => ({
            amount: b.amount,
            bidderId: b.bidderId,
          })),
        };
        const auctionStatus = calculateAuctionStatus(auction, bid.bidderId);
        return auctionStatus === 'WINNING';
      }).length;

      return {
        totalEarnings: Math.round(sellerEarnings * 100) / 100,
        totalPostedAuctions,
        currentlyBidding,
        currentlyWinning,
      };
    } catch (error) {
      this.loggingService.logError(
        'Failed to fetch user statistics (optimized)',
        error,
        { userId },
      );
      throw error;
    }
  }
}
