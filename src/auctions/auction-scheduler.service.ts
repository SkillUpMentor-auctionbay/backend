import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { AuctionEndService } from './auction-end.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AuctionSchedulerService {
  private readonly logger = new Logger(AuctionSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
    private auctionEndService: AuctionEndService,
  ) {}

  /**
   * Schedule a job to process auction end at the specified time
   */
  async scheduleAuctionEnd(auctionId: string, endTime: Date): Promise<void> {
    this.loggingService.logInfo('Scheduling auction end job', {
      auctionId,
      scheduledAt: endTime,
    });

    try {
      // Check if job already exists
      const existingJob = await this.prisma.scheduledJob.findUnique({
        where: { auctionId },
      });

      if (existingJob) {
        // Update existing job
        await this.prisma.scheduledJob.update({
          where: { auctionId },
          data: {
            scheduledAt: endTime,
            status: JobStatus.PENDING,
            updatedAt: new Date(),
          },
        });

        // Updated existing scheduled job successfully
        console.log(`Updated scheduled job for auction ${auctionId} from ${existingJob.scheduledAt} to ${endTime}`);
      } else {
        // Create new job
        await this.prisma.scheduledJob.create({
          data: {
            auctionId,
            scheduledAt: endTime,
            status: JobStatus.PENDING,
          },
        });

        console.log(`Created new scheduled job for auction ${auctionId} at ${endTime}`);
      }
    } catch (error) {
      this.loggingService.logError('Failed to schedule auction end job', error as Error, {
        auctionId,
        endTime,
      });
      throw error;
    }
  }

  /**
   * Reschedule an existing job to a new time
   */
  async rescheduleAuctionEnd(auctionId: string, newEndTime: Date): Promise<void> {
    this.loggingService.logInfo('Rescheduling auction end job', {
      auctionId,
      newScheduledAt: newEndTime,
    });

    try {
      const job = await this.prisma.scheduledJob.findUnique({
        where: { auctionId },
      });

      if (!job) {
        throw new Error(`No scheduled job found for auction ${auctionId}`);
      }

      await this.prisma.scheduledJob.update({
        where: { auctionId },
        data: {
          scheduledAt: newEndTime,
          status: JobStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      this.loggingService.logInfo('Rescheduled auction end job', {
        auctionId,
        oldScheduledAt: job.scheduledAt,
        newScheduledAt: newEndTime,
      });
    } catch (error) {
      this.loggingService.logError('Failed to reschedule auction end job', error as Error, {
        auctionId,
        newEndTime,
      });
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   */
  async cancelAuctionEnd(auctionId: string): Promise<void> {
    this.loggingService.logInfo('Cancelling auction end job', {
      auctionId,
    });

    try {
      const deletedJob = await this.prisma.scheduledJob.delete({
        where: { auctionId },
      });

      if (deletedJob) {
        this.loggingService.logInfo('Cancelled scheduled job', {
          auctionId,
          scheduledAt: deletedJob.scheduledAt,
          status: deletedJob.status,
        });
      } else {
        this.logger.warn(`No scheduled job found to cancel for auction ${auctionId}`);
      }
    } catch (error) {
      this.loggingService.logError('Failed to cancel auction end job', error as Error, {
        auctionId,
      });
      throw error;
    }
  }

  /**
   * Process all scheduled jobs that are due
   * Runs every minute at the start of the minute
   */
  @Cron('0 * * * * *')
  async processScheduledJobs(): Promise<void> {
    const now = new Date();
    this.logger.log('Processing scheduled jobs...');

    try {
      // Find jobs that are due and pending
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
        this.logger.log('No scheduled jobs due for processing');
        return;
      }

      this.logger.log(`Found ${dueJobs.length} scheduled jobs to process`);

      for (const job of dueJobs) {
        await this.executeJob(job);
      }

      this.loggingService.logInfo('Processed scheduled jobs', {
        processedCount: dueJobs.length,
        jobIds: dueJobs.map(job => job.id),
      });
    } catch (error) {
      this.logger.error('Failed to process scheduled jobs', error);
      this.loggingService.logError('Failed to process scheduled jobs', error as Error);
    }
  }

  /**
   * Execute a single scheduled job
   */
  private async executeJob(job: any): Promise<void> {
    const { auctionId, auction } = job;

    // Debug logging
    console.log('🔥 EXECUTE JOB DEBUG:', {
      jobId: job.id,
      auctionId,
      hasAuction: !!auction,
      auctionKeys: auction ? Object.keys(auction) : 'no auction object',
      scheduledAt: job.scheduledAt,
      auctionTitle: auction?.title,
      bidCount: auction?.bids?.length || 0,
    });

    if (!auction) {
      console.error('❌ No auction data found in job:', job);
      throw new Error(`Auction data not found for job ${job.id}`);
    }

    if (!auction.bids || auction.bids.length === 0) {
      console.log('⚠️ Auction has no bids, skipping notifications');
      // Still mark job as executed but don't create notifications
      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.EXECUTED,
          executedAt: new Date(),
        },
      });
      return;
    }

    this.loggingService.logInfo('Executing scheduled job', {
      jobId: job.id,
      auctionId,
      scheduledAt: job.scheduledAt,
      auctionTitle: auction.title,
      bidCount: auction.bids.length,
    });

    try {
      // Mark job as executing
      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.EXECUTED,
          executedAt: new Date(),
        },
      });

      // Process the auction end (create notifications)
      console.log('📢 About to create notifications for auction:', auction.id);
      await this.auctionEndService.createNotificationsForAuction(auction);
      console.log('✅ Notifications created successfully');

      this.loggingService.logInfo('Successfully executed scheduled job', {
        jobId: job.id,
        auctionId,
        auctionTitle: auction.title,
        bidCount: auction.bids.length,
      });
    } catch (error) {
      console.error('💥 ERROR in executeJob:', error);
      this.loggingService.logError('Failed to execute scheduled job', error as Error, {
        jobId: job.id,
        auctionId,
        error: error.message,
      });

      // Mark job as failed
      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          error: error.message,
        },
      });
    }
  }

  /**
   * Get scheduled job information for debugging/monitoring
   */
  async getScheduledJobs(): Promise<any[]> {
    try {
      return await this.prisma.scheduledJob.findMany({
        include: {
          auction: {
            select: {
              id: true,
              title: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });
    } catch (error) {
      this.loggingService.logError('Failed to get scheduled jobs', error as Error);
      throw error;
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  async processScheduledJobsManually(): Promise<void> {
    this.logger.log('Manual trigger: Processing scheduled jobs');
    await this.processScheduledJobs();
  }
}