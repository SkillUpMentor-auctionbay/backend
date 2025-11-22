import {
  Controller,
  Get,
  Patch,
  Request,
  Query,
  UseGuards,
  HttpStatus,
  Res,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { LoggingService } from '../common/services/logging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SseAuthGuard } from '../auth/guards/sse-auth.guard';
import { NotificationDto } from './dto/notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@ApiTags('notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private sseService: SseService,
    private loggingService: LoggingService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiQuery({ name: 'isCleared', required: false, type: Boolean, description: 'Filter by cleared status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: { $ref: '#/components/schemas/NotificationDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  async getUserNotifications(@Request() req, @Query() queryDto: NotificationQueryDto) {
    // 🚨 SECURITY FIX: Use 'id' instead of 'userId' from JWT payload
    const userId = req.user.id;

    // SECURITY DEBUG: Log what user is making the request
    console.log('🔐 SECURITY DEBUG - getUserNotifications called:', {
      userId,
      hasUser: !!req.user,
      userKeys: req.user ? Object.keys(req.user) : 'no user object',
      authorization: req.headers.authorization ? 'present' : 'missing',
      query: queryDto,
    });

    if (!userId) {
      console.error('🚨 SECURITY ALERT - No user ID found in request!');
      throw new UnauthorizedException('User not authenticated');
    }

    this.loggingService.logInfo('Getting user notifications', {
      userId,
      query: queryDto,
    });

    const result = await this.notificationsService.getUserNotifications(userId, queryDto);

    // SECURITY DEBUG: Log what notifications are being returned
    console.log('📊 SECURITY DEBUG - Notifications being returned:', {
      requestedUserId: userId,
      notificationCount: result.notifications.length,
      notificationIds: result.notifications.map(n => n.id),
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Notifications retrieved successfully',
      data: result,
    };
  }

  @Patch('clear-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'All notifications cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async clearAllNotifications(@Request() req) {
    const userId = req.user.id;

    this.loggingService.logInfo('Clearing all notifications', { userId });

    await this.notificationsService.clearAllNotifications(userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'All notifications cleared successfully',
    };
  }

  @Get('stream')
  @UseGuards(SseAuthGuard)
  @ApiBearerAuth('JWT')
  async streamNotifications(
    @Request() req,
    @Res() response: Response,
    @Headers('last-event-id') lastEventId?: string,
    @Query('token') token?: string,
  ) {
    const userId = req.user.id;

    this.loggingService.logInfo('Starting notification stream', { userId, lastEventId });

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization, Last-Event-ID',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Add connection to SSE service
    console.log('🔌 Adding SSE connection for user:', userId);
    this.sseService.addConnection(userId, response);

    // Listen for client disconnect
    req.on('close', () => {
      this.loggingService.logInfo('Client disconnected from notification stream', { userId });
      this.sseService.removeConnection(userId, response);
    });

    // Send recent notifications if this is a reconnection
    if (lastEventId) {
      try {
        const recentNotifications = await this.notificationsService.getUserNotifications(userId, {
          page: 1,
          limit: 10,
        });

        recentNotifications.notifications.forEach(notification => {
          response.write(`event: notification\n`);
          response.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
      } catch (error) {
        this.loggingService.logError('Failed to send recent notifications on reconnection', error as Error, {
          userId,
        });
      }
    }

    // Handle connection errors
    response.on('error', (error) => {
      this.loggingService.logError('SSE connection error', error as Error, {
        userId,
      });
      this.sseService.removeConnection(userId, response);
    });
  }
}
