import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionEndService } from './auction-end.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionEndController } from './auction-end.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggingService } from '../common/services/logging.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Required for cron jobs
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [
    AuctionEndController,
  ],
  providers: [
    AuctionEndService,
    AuctionSchedulerService,
    LoggingService,
  ],
  exports: [
    AuctionEndService,
    AuctionSchedulerService,
  ],
})
export class AuctionEndModule {}