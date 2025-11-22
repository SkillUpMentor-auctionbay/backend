import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Get,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuctionService } from './auction.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionEndService } from './auction-end.service';
import { LoggingService } from '../common/services/logging.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  TestSetAuctionTimeDto,
  TestResetAuctionDto,
  TestBatchAuctionOperationDto,
  TestSimulateBiddingDto,
} from './dto/test-auction.dto';

@ApiTags('Auction Testing')
@Controller({ path: 'auctions', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class TestAuctionController {
  constructor(
    private readonly auctionService: AuctionService,
    private readonly auctionSchedulerService: AuctionSchedulerService,
    private readonly auctionEndService: AuctionEndService,
    private readonly loggingService: LoggingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('test/auction/:id/set-time')
  @ApiOperation({
    summary: 'Set auction end time for testing',
    description: 'Set a specific end time for an auction. Useful for testing time-sensitive UI features. Only available in development/test environment.'
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({
    status: 200,
    description: 'Auction time updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Endpoint not available in production',
  })
  async testSetAuctionTime(
    @Param('id') auctionId: string,
    @Body() setTimeDto: TestSetAuctionTimeDto,
    @Request() req,
  ) {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    await this.loggingService.logInfo('TEST: Setting auction time', {
      auctionId,
      userId: req.user?.userId,
      endTime: new Date(setTimeDto.endTime),
      updates: {
        bypassValidation: setTimeDto.bypassValidation,
      },
    });

    return this.auctionService.testSetAuctionTime(auctionId, setTimeDto);
  }

  @Post('test/auction/:id/reset')
  @ApiOperation({
    summary: 'Reset auction to specific state for testing',
    description: 'Comprehensive reset of auction state including price, time, bids, etc. Useful for testing various auction scenarios.'
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({
    status: 200,
    description: 'Auction reset successfully',
  })
  async testResetAuction(
    @Param('id') auctionId: string,
    @Body() resetDto: TestResetAuctionDto,
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    await this.loggingService.logInfo('TEST: Resetting auction state', {
      auctionId,
      userId: req.user?.userId,
      currentPrice: resetDto.currentPrice,
      endTime: resetDto.endTime ? new Date(resetDto.endTime) : undefined,
      updates: {
        status: resetDto.status,
        clearBids: resetDto.clearBids,
      },
    });

    return this.auctionService.testResetAuction(auctionId, resetDto);
  }

  @Post('test/auctions/batch-operation')
  @ApiOperation({
    summary: 'Perform batch operations on multiple auctions',
    description: 'Apply time offsets, price changes, or status updates to multiple auctions at once. Great for testing large-scale scenarios.'
  })
  @ApiResponse({
    status: 200,
    description: 'Batch operation completed successfully',
  })
  async testBatchOperation(
    @Body() batchDto: TestBatchAuctionOperationDto,
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    await this.loggingService.logInfo('TEST: Performing batch auction operation', {
      auctionIds: batchDto.auctionIds,
      userId: req.user?.userId,
      updates: {
        minutesOffset: batchDto.minutesOffset,
        hoursOffset: batchDto.hoursOffset,
        daysOffset: batchDto.daysOffset,
        status: batchDto.status,
        priceMultiplier: batchDto.priceMultiplier,
      },
    });

    return this.auctionService.testBatchOperation(batchDto);
  }

  @Post('test/auction/:id/simulate-bidding')
  @ApiOperation({
    summary: 'Simulate bidding activity on an auction',
    description: 'Create fake bidding activity to test UI behavior during active bidding. Can simulate multiple bids from different users.'
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({
    status: 200,
    description: 'Bidding simulation completed successfully',
  })
  async testSimulateBidding(
    @Param('id') auctionId: string,
    @Body() biddingDto: TestSimulateBiddingDto,
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    await this.loggingService.logInfo('TEST: Simulating bidding activity', {
      auctionId,
      userId: req.user?.userId,
      bidCount: biddingDto.numberOfBids,
      updates: {
        startAmount: biddingDto.startAmount,
        maxAmount: biddingDto.maxAmount,
        bidInterval: biddingDto.bidInterval,
      },
    });

    return this.auctionService.testSimulateBidding(auctionId, biddingDto);
  }

  @Get('test/auctions/create-sample')
  @ApiOperation({
    summary: 'Create sample auctions for testing',
    description: 'Create multiple sample auctions with varied times and prices for comprehensive testing.'
  })
  @ApiQuery({
    name: 'count',
    required: false,
    type: Number,
    description: 'Number of sample auctions to create (default: 5)',
    example: 10,
  })
  @ApiQuery({
    name: 'timeSpread',
    required: false,
    type: Number,
    description: 'Time spread in hours from now (default: 24)',
    example: 48,
  })
  @ApiResponse({
    status: 201,
    description: 'Sample auctions created successfully',
  })
  async testCreateSampleAuctions(
    @Request() req,
    @Query('count') count?: number,
    @Query('timeSpread') timeSpread?: number,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    const auctionCount = count || 5;
    const hoursSpread = timeSpread || 24;

    await this.loggingService.logInfo('TEST: Creating sample auctions', {
      sellerId: req.user?.userId,
      updates: {
        auctionCount,
        timeSpread: hoursSpread,
      },
    });

    return this.auctionService.testCreateSampleAuctions(req.user.userId, auctionCount, hoursSpread);
  }

  @Get('test/environment')
  @ApiOperation({
    summary: 'Get test environment information',
    description: 'Returns information about the current test environment and available test utilities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Environment information retrieved successfully',
  })
  async getTestEnvironmentInfo() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    return {
      environment: process.env.NODE_ENV,
      testEndpointsAvailable: true,
      databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
      timezones: {
        server: new Date().toString(),
        utc: new Date().toUTCString(),
        iso: new Date().toISOString(),
      },
      features: {
        setTimeManipulation: true,
        batchOperations: true,
        biddingSimulation: true,
        sampleAuctionCreation: true,
      },
    };
  }

  @Post('test/cleanup')
  @ApiOperation({
    summary: 'Clean up test data',
    description: 'Remove test auctions and related data. Use with caution!',
  })
  @ApiQuery({
    name: 'olderThan',
    required: false,
    type: Number,
    description: 'Remove auctions older than X hours (default: 24)',
    example: 48,
  })
  @ApiQuery({
    name: 'onlySample',
    required: false,
    type: Boolean,
    description: 'Only remove sample auctions (those with "test" in title)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  async testCleanup(
    @Request() req,
    @Query('olderThan') olderThan?: number,
    @Query('onlySample') onlySample?: boolean,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    const hours = olderThan || 24;
    const onlySampleAuctions = onlySample !== undefined ? onlySample : true;

    await this.loggingService.logInfo('TEST: Cleaning up test data', {
      userId: req.user?.userId,
      updates: {
        olderThan: hours,
        onlySample: onlySampleAuctions,
      },
    });

    return this.auctionService.testCleanup(hours, onlySampleAuctions);
  }

  // ==================== NOTIFICATION TESTING ENDPOINTS ====================

  @Post('test/notification/prepare-auction/:id')
  @ApiOperation({
    summary: 'Prepare auction for notification testing',
    description: 'Sets up an auction with future end time and corresponding scheduled job for notification testing. Creates job if needed.'
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiQuery({
    name: 'endTime',
    required: false,
    type: String,
    description: 'End time in ISO format (e.g., "2025-11-16T16:30:00.000Z"). Can also be provided in request body.',
    example: '2025-11-16T16:30:00.000Z',
  })
  @ApiQuery({
    name: 'createBids',
    required: false,
    type: Boolean,
    description: 'Create test bids if auction has no bids. Can also be provided in request body.',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Auction prepared for notification testing',
  })
  async testPrepareAuctionForNotifications(
    @Param('id') auctionId: string,
    @Body() body: { endTime: string; createBids?: boolean },
    @Query() query: { endTime?: string; createBids?: string },
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    // Debug logging
    console.log('🐛 DEBUG - Received request:', {
      auctionId,
      body,
      query,
      bodyKeys: body ? Object.keys(body) : 'body is null/undefined',
      queryKeys: query ? Object.keys(query) : 'query is null/undefined',
    });

    // Validate inputs
    if (!auctionId) {
      throw new BadRequestException('Auction ID is required');
    }

    // Accept endTime from either body or query params
    const endTimeString = body?.endTime || query?.endTime;

    if (!endTimeString) {
      throw new BadRequestException('End time is required. Provide it in request body or as query parameter.');
    }

    const endTime = new Date(endTimeString);
    const createBids = body?.createBids === true || query?.createBids === 'true';
    const now = new Date();

    // Validate date
    if (isNaN(endTime.getTime())) {
      throw new BadRequestException(`Invalid end time format: ${endTimeString}. Please use ISO format like "2025-11-16T15:30:00.000Z"`);
    }

    if (endTime <= now) {
      throw new BadRequestException('End time must be in the future');
    }

    await this.loggingService.logInfo('TEST: Preparing auction for notification testing', {
      auctionId,
      userId: req.user?.userId,
      endTime: endTime,
      createBids: createBids,
    });

    // Step 0: Check if auction exists
    const existingAuction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!existingAuction) {
      throw new BadRequestException(`Auction with ID ${auctionId} not found`);
    }

    // Step 1: Update auction end time
    const auction = await this.prisma.auction.update({
      where: { id: auctionId },
      data: { endTime },
      include: {
        bids: {
          include: { bidder: true },
          orderBy: { amount: 'desc' },
        },
      },
    });

    // Step 2: Get existing jobs for this auction
    const existingJobs = await this.prisma.scheduledJob.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
    });

    // Step 3: Cancel existing jobs
    if (existingJobs.length > 0) {
      await this.prisma.scheduledJob.updateMany({
        where: {
          auctionId,
          status: 'PENDING',
        },
        data: { status: 'CANCELLED' },
      });
    }

    // Step 4: Create new scheduled job
    const newJob = await this.prisma.scheduledJob.create({
      data: {
        auctionId,
        scheduledAt: endTime,
        status: 'PENDING',
      },
    });

    // Step 5: Optionally create test bids
    let createdBids = [];
    if (createBids && auction.bids.length === 0) {
      // Create some test bids for realistic notification testing
      const testUsers = await this.prisma.user.findMany({
        where: { id: { not: auction.sellerId } },
        take: 3,
      });

      if (testUsers.length >= 2) {
        for (let i = 0; i < Math.min(3, testUsers.length); i++) {
          const bidAmount = Number(auction.startingPrice) + (i + 1) * 10;
          const bid = await this.prisma.bid.create({
            data: {
              amount: bidAmount,
              auctionId,
              bidderId: testUsers[i].id,
            },
            include: { bidder: true },
          });
          createdBids.push(bid);
        }
      }
    }

    // Step 6: Get updated auction with bids
    const updatedAuction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: { bidder: true },
          orderBy: { amount: 'desc' },
        },
        seller: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      success: true,
      auction: updatedAuction,
      scheduledJob: newJob,
      cancelledJobs: existingJobs.filter(job => job.status === 'PENDING').length,
      createdBids: createdBids.length,
      nextExecution: endTime,
      message: `Auction prepared for notification testing. Will execute at ${endTime.toISOString()}`,
    };
  }

  @Get('test/notification/status/:auctionId')
  @ApiOperation({
    summary: 'Get notification testing status for auction',
    description: 'Shows current auction state, scheduled jobs, and existing notifications for comprehensive testing insight.',
  })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification testing status retrieved successfully',
  })
  async testGetNotificationStatus(
    @Param('auctionId') auctionId: string,
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    const now = new Date();

    // Get auction details
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: { bidder: true },
          orderBy: { amount: 'desc' },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new BadRequestException('Auction not found');
    }

    // Get scheduled jobs
    const scheduledJobs = await this.prisma.scheduledJob.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
    });

    // Determine auction status
    const isEnded = auction.endTime <= now;
    const hasPendingJob = scheduledJobs.some(job => job.status === 'PENDING');
    const hasExecutedJob = scheduledJobs.some(job => job.status === 'EXECUTED');
    const hasNotifications = auction.notifications.length > 0;

    // Predict next execution
    const pendingJobs = scheduledJobs.filter(job => job.status === 'PENDING');
    const nextExecution = pendingJobs.length > 0 ? pendingJobs[0].scheduledAt : null;

    return {
      auction: {
        id: auction.id,
        title: auction.title,
        endTime: auction.endTime,
        isEnded,
        currentPrice: auction.bids.length > 0 ? auction.bids[0].amount : auction.startingPrice,
        bidCount: auction.bids.length,
      },
      scheduledJobs: scheduledJobs.map(job => ({
        id: job.id,
        status: job.status,
        scheduledAt: job.scheduledAt,
        isOverdue: job.scheduledAt <= now && job.status === 'PENDING',
        timeUntilExecution: job.status === 'PENDING' ?
          Math.max(0, job.scheduledAt.getTime() - now.getTime()) : null,
      })),
      notifications: {
        count: auction.notifications.length,
        latest: auction.notifications[0] || null,
        types: {
          winners: auction.notifications.filter(n => n.price !== null).length,
          losers: auction.notifications.filter(n => n.price === null).length,
        },
      },
      testing: {
        isReadyForTesting: !isEnded && hasPendingJob,
        shouldHaveExecuted: isEnded && !hasExecutedJob && !hasNotifications,
        nextExecution,
        recommendations: this.getTestingRecommendations(isEnded, hasPendingJob, hasExecutedJob, hasNotifications, auction.bids.length),
      },
      timestamp: now.toISOString(),
    };
  }

  @Post('test/notification/execute-job/:auctionId')
  @ApiOperation({
    summary: 'Manually execute notification job for auction',
    description: 'Immediately processes the auction end and creates notifications, bypassing the scheduler. Useful for testing.',
  })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  @ApiResponse({
    status: 200,
    description: 'Job executed successfully',
  })
  async testExecuteNotificationJob(
    @Param('auctionId') auctionId: string,
    @Request() req,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    await this.loggingService.logInfo('TEST: Manually executing notification job', {
      auctionId,
      userId: req.user?.userId,
    });

    // Get auction with bids
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: { bidder: true },
          orderBy: { amount: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new BadRequestException('Auction not found');
    }

    if (auction.bids.length === 0) {
      throw new BadRequestException('Cannot execute job for auction with no bids');
    }

    // Get existing pending job
    const pendingJob = await this.prisma.scheduledJob.findFirst({
      where: {
        auctionId,
        status: 'PENDING',
      },
    });

    if (!pendingJob) {
      throw new BadRequestException('No pending job found for this auction');
    }

    // Execute notifications
    await this.auctionEndService.createNotificationsForAuction(auction);

    // Mark job as executed
    await this.prisma.scheduledJob.update({
      where: { id: pendingJob.id },
      data: { status: 'EXECUTED' },
    });

    // Get created notifications
    const notifications = await this.prisma.notification.findMany({
      where: { auctionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      executedAt: new Date().toISOString(),
      auction: {
        id: auction.id,
        title: auction.title,
        bidCount: auction.bids.length,
      },
      notifications: {
        created: notifications.length,
        winners: notifications.filter(n => n.price !== null).length,
        losers: notifications.filter(n => n.price === null).length,
        details: notifications.map(n => ({
          id: n.id,
          userId: n.userId,
          userName: n.user.name,
          price: n.price,
          type: n.price !== null ? 'winner' : 'loser',
        })),
      },
      message: `Successfully executed notification job and created ${notifications.length} notifications`,
    };
  }

  @Get('test/notification/system-overview')
  @ApiOperation({
    summary: 'Get overview of notification system state',
    description: 'Shows all pending jobs, recent executions, and system health for debugging.',
  })
  @ApiResponse({
    status: 200,
    description: 'System overview retrieved successfully',
  })
  async testGetNotificationSystemOverview(@Request() req) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints are not available in production');
    }

    const now = new Date();

    // Get all scheduled jobs
    const allJobs = await this.prisma.scheduledJob.findMany({
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            endTime: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Get recent notifications
    const recentNotifications = await this.prisma.notification.findMany({
      include: {
        user: { select: { id: true, name: true } },
        auction: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // System statistics
    const stats = {
      totalJobs: allJobs.length,
      pendingJobs: allJobs.filter(job => job.status === 'PENDING').length,
      executedJobs: allJobs.filter(job => job.status === 'EXECUTED').length,
      failedJobs: allJobs.filter(job => job.status === 'FAILED').length,
      cancelledJobs: allJobs.filter(job => job.status === 'CANCELLED').length,
      overdueJobs: allJobs.filter(job =>
        job.status === 'PENDING' && job.scheduledAt <= now
      ).length,
      recentNotifications: recentNotifications.length,
    };

    return {
      timestamp: now.toISOString(),
      statistics: stats,
      jobs: {
        pending: allJobs.filter(job => job.status === 'PENDING').map(job => ({
          id: job.id,
          auctionId: job.auctionId,
          auctionTitle: job.auction.title,
          scheduledAt: job.scheduledAt,
          isOverdue: job.scheduledAt <= now,
          minutesUntil: Math.max(0, (job.scheduledAt.getTime() - now.getTime()) / (1000 * 60)),
        })),
        overdue: allJobs.filter(job =>
          job.status === 'PENDING' && job.scheduledAt <= now
        ).map(job => ({
          id: job.id,
          auctionId: job.auctionId,
          auctionTitle: job.auction.title,
          scheduledAt: job.scheduledAt,
          minutesOverdue: (now.getTime() - job.scheduledAt.getTime()) / (1000 * 60),
        })),
        recent: allJobs.filter(job => job.status === 'EXECUTED')
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 10)
          .map(job => ({
            id: job.id,
            auctionId: job.auctionId,
            auctionTitle: job.auction.title,
            executedAt: job.updatedAt,
          })),
      },
      notifications: recentNotifications.slice(0, 10).map(notif => ({
        id: notif.id,
        auctionTitle: notif.auction.title,
        userName: notif.user.name,
        type: notif.price !== null ? 'winner' : 'loser',
        price: notif.price,
        createdAt: notif.createdAt,
      })),
      health: {
        hasOverdueJobs: stats.overdueJobs > 0,
        schedulerHealthy: stats.failedJobs === 0,
        nextExecution: allJobs
          .filter(job => job.status === 'PENDING')
          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]?.scheduledAt || null,
      },
    };
  }

  private getTestingRecommendations(isEnded: boolean, hasPendingJob: boolean, hasExecutedJob: boolean, hasNotifications: boolean, bidCount: number): string[] {
    const recommendations: string[] = [];

    if (bidCount === 0) {
      recommendations.push('❌ No bids placed - notifications will not be meaningful');
    } else if (bidCount === 1) {
      recommendations.push('⚠️ Only one bid - only winner notification will be created');
    }

    if (isEnded && !hasExecutedJob && !hasNotifications) {
      recommendations.push('🚨 Auction has ended but no notifications exist - check job execution');
    }

    if (!isEnded && !hasPendingJob) {
      recommendations.push('⚠️ No pending job scheduled - use prepare-auction endpoint');
    }

    if (hasExecutedJob && !hasNotifications) {
      recommendations.push('❌ Job executed but no notifications created - check auction end service');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Auction is properly configured for notification testing');
    }

    return recommendations;
  }
}