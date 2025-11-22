import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SseService } from './sse.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggingService } from '../common/services/logging.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, SseService, LoggingService],
  controllers: [NotificationsController],
  exports: [NotificationsService, SseService],
})
export class NotificationsModule {}
