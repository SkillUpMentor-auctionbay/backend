import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { TestAuctionController } from './test-auction.controller';
import { AuctionService } from './auction.service';
import { BidsService } from './bids.service';
import { AuctionEndModule } from './auction-end.module';
import { LoggingService } from '../common/services/logging.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuctionEndModule],
  controllers: [AuctionController, TestAuctionController],
  providers: [AuctionService, BidsService, LoggingService, FileUploadService],
  exports: [AuctionService, BidsService],
})
export class AuctionModule {}