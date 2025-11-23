import { Injectable } from '@nestjs/common';
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
  constructor(
    private loggingService: LoggingService,
    private notificationsService: NotificationsService,
  ) {}

  
  async createNotificationsForAuction(auction: AuctionWithBids) {
    this.loggingService.logInfo('Creating notifications for ended auction', {
      auctionId: auction.id,
      title: auction.title,
      bidCount: auction.bids.length,
    });

    if (auction.bids.length === 0) {
      return;
    }

    const sortedBids = auction.bids.sort((a, b) => Number(b.amount) - Number(a.amount));

    const winner = sortedBids[0];
    const losers = sortedBids.slice(1);

    try {
      const winnerNotification = await this.notificationsService.createNotification({
        userId: winner.bidder.id,
        auctionId: auction.id,
        price: Number(winner.amount),
      });

      this.loggingService.logInfo('Winner notification created', {
        auctionId: auction.id,
        winnerId: winner.bidder.id,
        winnerName: winner.bidder.name,
        finalPrice: Number(winner.amount),
        notificationId: winnerNotification.id,
      });
    } catch (error) {
      this.loggingService.logError('Failed to create winner notification', error as Error, {
        auctionId: auction.id,
        winnerId: winner.bidder.id,
      });
    }

    for (const loser of losers) {
      try {
        const loserNotification = await this.notificationsService.createNotification({
          userId: loser.bidder.id,
          auctionId: auction.id,
          price: null,
        });

        this.loggingService.logInfo('Loser notification created', {
          auctionId: auction.id,
          loserId: loser.bidder.id,
          loserName: loser.bidder.name,
          notificationId: loserNotification.id,
        });
      } catch (error) {
        this.loggingService.logError('Failed to create loser notification', error as Error, {
          auctionId: auction.id,
          loserId: loser.bidder.id,
        });
      }
    }
  }
}