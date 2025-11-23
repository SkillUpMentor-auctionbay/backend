import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { BidsService } from './bids.service';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionEndService } from './auction-end.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoggingService } from '../common/services/logging.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionSchedulerService, AuctionEndService, BidsService, LoggingService, FileUploadService],
  exports: [AuctionService, BidsService],
})
export class AuctionModule {}