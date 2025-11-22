import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { NotificationsService } from '../notifications/notifications.service';

interface AuctionWithBids {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startingPrice: any;
  endTime: Date;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
  bids: Array<{
    id: string;
    amount: any;
    auctionId: string;
    bidderId: string;
    createdAt: Date;
    bidder: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  scheduledJobs?: Array<{
    id: string;
    auctionId: string;
    scheduledAt: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@Injectable()
export class AuctionEndService {
  private readonly logger = new Logger(AuctionEndService.name);

  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
    private notificationsService: NotificationsService,
  ) {}

  
  /**
   * Create notifications for all participants in an ended auction
   */
  async createNotificationsForAuction(auction: AuctionWithBids) {
    console.log('🎯 createNotificationsForAuction called for auction:', auction.id, 'title:', auction.title);
    this.loggingService.logInfo('Creating notifications for ended auction', {
      auctionId: auction.id,
      title: auction.title,
      bidCount: auction.bids.length,
    });

    if (auction.bids.length === 0) {
      console.log('⏭️ Auction', auction.id, 'had no bids, skipping notifications');
      this.logger.log(`Auction ${auction.id} had no bids, skipping notifications`);
      return;
    }

    console.log('🏆 Processing', auction.bids.length, 'bids for auction:', auction.id);

    // Sort bids by amount (highest first) - they should already be sorted
    const sortedBids = auction.bids.sort((a, b) => Number(b.amount) - Number(a.amount));

    const winner = sortedBids[0];
    const losers = sortedBids.slice(1);

    console.log('👑 Winner identified:', winner.bidder.id, winner.bidder.name, 'amount:', winner.amount);
    console.log('😞 Losers identified:', losers.map(l => ({ id: l.bidder.id, name: l.bidder.name })));

    // Create winner notification with final price
    try {
      console.log('🏆 Creating winner notification for user:', winner.bidder.id);
      const winnerNotification = await this.notificationsService.createNotification({
        userId: winner.bidder.id,
        auctionId: auction.id,
        price: Number(winner.amount),
      });

      console.log('✅ Winner notification created successfully:', winnerNotification.id);
      this.loggingService.logInfo('Winner notification created', {
        auctionId: auction.id,
        winnerId: winner.bidder.id,
        winnerName: winner.bidder.name,
        finalPrice: Number(winner.amount),
        notificationId: winnerNotification.id,
      });
    } catch (error) {
      console.log('❌ Failed to create winner notification for user:', winner.bidder.id, error);
      this.loggingService.logError('Failed to create winner notification', error as Error, {
        auctionId: auction.id,
        winnerId: winner.bidder.id,
      });
    }

    // Create loser notifications (null price indicates outbid)
    for (const loser of losers) {
      try {
        console.log('💔 Creating loser notification for user:', loser.bidder.id);
        const loserNotification = await this.notificationsService.createNotification({
          userId: loser.bidder.id,
          auctionId: auction.id,
          price: null,
        });

        console.log('✅ Loser notification created successfully:', loserNotification.id);
        this.loggingService.logInfo('Loser notification created', {
          auctionId: auction.id,
          loserId: loser.bidder.id,
          loserName: loser.bidder.name,
          notificationId: loserNotification.id,
        });
      } catch (error) {
        console.log('❌ Failed to create loser notification for user:', loser.bidder.id, error);
        this.loggingService.logError('Failed to create loser notification', error as Error, {
          auctionId: auction.id,
          loserId: loser.bidder.id,
        });
      }
    }

    console.log(`🎉 Created notifications for auction ${auction.id}: 1 winner, ${losers.length} losers`);
    this.logger.log(`Created notifications for auction ${auction.id}: 1 winner, ${losers.length} losers`);
  }

  /**
   * Find and process all auctions that have ended (fallback method)
   * This method is mainly for testing/manual recovery and shouldn't be needed in normal operation
   * since the scheduler handles auction end processing automatically
   */
  private async processEndedAuctions() {
    const now = new Date();

    // Find auctions that have ended but don't have completed scheduled jobs
    const endedAuctions = await this.prisma.auction.findMany({
      where: {
        endTime: {
          lte: now,
        },
        scheduledJobs: {
          none: {
            status: 'EXECUTED',
          },
        },
      },
      include: {
        bids: {
          include: {
            bidder: true,
          },
          orderBy: {
            amount: 'desc',
          },
        },
        scheduledJobs: true,
      },
    });

    this.logger.log(`Found ${endedAuctions.length} ended auctions to process`);

    // Process each ended auction
    for (const auction of endedAuctions) {
      await this.createNotificationsForAuction(auction);

      // Create a completed job record to mark this auction as processed
      await this.prisma.scheduledJob.create({
        data: {
          auctionId: auction.id,
          scheduledAt: auction.endTime,
          status: 'EXECUTED',
        },
      });
    }

    return {
      processed: endedAuctions.length,
      auctions: endedAuctions.map(a => ({ id: a.id, title: a.title })),
    };
  }

  /**
   * Manual trigger for testing purposes
   */
  async processEndedAuctionsManually() {
    this.logger.log('Manual trigger: Processing ended auctions...');
    return this.processEndedAuctions();
  }
}