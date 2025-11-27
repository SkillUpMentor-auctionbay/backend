import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { SseService } from './sse.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationDto } from './dto/notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
    private readonly sseService: SseService,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDto> {
    const { userId, auctionId, price } = createNotificationDto;

    this.loggingService.logInfo('Creating notification', {
      userId,
      auctionId,
      price,
      type: price ? 'won' : 'outbid',
    });

    try {
      await this.prisma.notification.deleteMany({
        where: {
          userId,
          auctionId,
        },
      });

      this.loggingService.logInfo(
        'Deleted existing notifications for user+auction',
        {
          userId,
          auctionId,
        },
      );

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          auctionId,
          price,
        },
        include: {
          auction: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              endTime: true,
            },
          },
        },
      });

      this.loggingService.logInfo('Notification created successfully', {
        notificationId: notification.id,
        userId,
        auctionId,
        price,
        type: price ? 'won' : 'outbid',
      });

      const notificationDto = this.mapToDto(notification);

      this.sseService.broadcastNotification(userId, notificationDto);

      return notificationDto;
    } catch (error) {
      this.loggingService.logError(
        'Failed to create notification',
        error as Error,
        {
          userId,
          auctionId,
          price,
        },
      );
      throw new BadRequestException('Failed to create notification');
    }
  }

  async getUserNotifications(
    userId: string,
    queryDto: NotificationQueryDto,
  ): Promise<{ notifications: NotificationDto[]; total: number }> {
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    this.loggingService.logInfo('Fetching user notifications', {
      userId,
      page,
      limit,
    });

    try {
      const where = {
        userId,
      };

      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          include: {
            auction: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                endTime: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where }),
      ]);

      const notificationDtos = notifications.map((notification) =>
        this.mapToDto(notification),
      );

      return {
        notifications: notificationDtos,
        total,
      };
    } catch (error) {
      this.loggingService.logError(
        'Failed to fetch user notifications',
        error as Error,
        {
          userId,
        },
      );
      throw new BadRequestException('Failed to fetch notifications');
    }
  }

  async clearAllNotifications(userId: string): Promise<void> {
    this.loggingService.logInfo('Clearing all notifications for user', {
      userId,
    });

    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          userId,
        },
      });

      this.loggingService.logInfo('All notifications deleted successfully', {
        userId,
        deletedCount: result.count,
      });
    } catch (error) {
      this.loggingService.logError(
        'Failed to clear notifications',
        error as Error,
        {
          userId,
        },
      );
      throw new BadRequestException('Failed to clear notifications');
    }
  }

  private mapToDto(notification: any): NotificationDto {
    return {
      id: notification.id,
      price: notification.price
        ? Number.parseFloat(notification.price.toString())
        : null,
      createdAt: notification.createdAt.toISOString(),
      auction: {
        id: notification.auction.id,
        title: notification.auction.title,
        imageUrl: notification.auction.imageUrl,
        endTime: notification.auction.endTime.toISOString(),
      },
    };
  }
}
