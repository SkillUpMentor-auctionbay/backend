import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { AuctionEndService } from './auction-end.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AuctionSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
    private readonly auctionEndService: AuctionEndService,
  ) {}


  async updateOrCreateAuctionEnd(auctionId: string, endTime: Date): Promise<void> {
    this.loggingService.logInfo('Updating or creating auction end job', {
      auctionId,
      scheduledAt: endTime,
    });

    try {
      const existingJob = await this.prisma.scheduledJob.findUnique({
        where: { auctionId },
      });

      if (existingJob) {
        await this.prisma.scheduledJob.update({
          where: { auctionId },
          data: {
            scheduledAt: endTime,
            status: JobStatus.PENDING,
            updatedAt: new Date(),
          },
        });

        this.loggingService.logInfo('Updated existing scheduled job', {
          auctionId,
          oldScheduledAt: existingJob.scheduledAt,
          newScheduledAt: endTime,
        });
      } else {
        await this.prisma.scheduledJob.create({
          data: {
            auctionId,
            scheduledAt: endTime,
            status: JobStatus.PENDING,
          },
        });

        this.loggingService.logInfo('Created new scheduled job', {
          auctionId,
          scheduledAt: endTime,
        });
      }
    } catch (error) {
      this.loggingService.logError('Failed to update or create auction end job', error as Error, {
        auctionId,
        endTime,
      });
      throw error;
    }
  }

  async cancelAuctionEnd(auctionId: string): Promise<void> {
    this.loggingService.logInfo('Cancelling auction end job', {
      auctionId,
    });

    try {
      const existingJob = await this.prisma.scheduledJob.findUnique({
        where: { auctionId },
      });

      if (existingJob) {
        const deletedJob = await this.prisma.scheduledJob.delete({
          where: { auctionId },
        });

        this.loggingService.logInfo('Cancelled scheduled job', {
          auctionId,
          scheduledAt: deletedJob.scheduledAt,
          status: deletedJob.status,
        });
      } else {
        this.loggingService.logWarning('No scheduled job found to cancel for auction', {
          auctionId,
        });
      }
    } catch (error) {
      this.loggingService.logError('Failed to cancel auction end job', error as Error, {
        auctionId,
      });
      throw error;
    }
  }

  @Cron('0 * * * * *')
  async processScheduledJobs(): Promise<void> {
    const now = new Date();
    this.loggingService.logInfo('Processing scheduled jobs...');

    try {
      const dueJobs = await this.prisma.scheduledJob.findMany({
        where: {
          scheduledAt: {
            lte: now,
          },
          status: JobStatus.PENDING,
        },
        include: {
          auction: {
            include: {
              bids: {
                include: {
                  bidder: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      if (dueJobs.length === 0) {
        this.loggingService.logInfo('No scheduled jobs due for processing');
        return;
      }

      this.loggingService.logInfo('Found scheduled jobs to process', {
        processedCount: dueJobs.length,
        jobIds: dueJobs.map(job => job.id),
      });

      for (const job of dueJobs) {
        await this.executeJob(job);
      }

      this.loggingService.logInfo('Processed scheduled jobs', {
        processedCount: dueJobs.length,
        jobIds: dueJobs.map(job => job.id),
      });
    } catch (error) {
      this.loggingService.logError('Failed to process scheduled jobs', error as Error);
    }
  }


  private async executeJob(job: any): Promise<void> {
    const { auctionId, auction } = job;

    if (!auction) {
      throw new Error(`Auction data not found for job ${job.id}`);
    }

    this.loggingService.logInfo('Executing scheduled job', {
      jobId: job.id,
      auctionId,
      scheduledAt: job.scheduledAt,
      auctionTitle: auction.title,
      bidCount: auction.bids?.length || 0,
    });

    try {
      if (!auction.bids || auction.bids.length === 0) {
        await this.prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.EXECUTED,
            executedAt: new Date(),
          },
        });

        this.loggingService.logInfo('Executed job with no bids', {
          jobId: job.id,
          auctionId,
          auctionTitle: auction.title,
        });
        return;
      }

      await this.auctionEndService.createNotificationsForAuction(auction);

      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.EXECUTED,
          executedAt: new Date(),
        },
      });

      this.loggingService.logInfo('Successfully executed scheduled job', {
        jobId: job.id,
        auctionId,
        auctionTitle: auction.title,
        bidCount: auction.bids.length,
      });
    } catch (error) {
      this.loggingService.logError('Failed to execute scheduled job', error as Error, {
        jobId: job.id,
        auctionId,
        error: error.message,
      });

      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          error: error.message,
        },
      });
    }
  }

}