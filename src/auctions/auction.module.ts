import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { BidsService } from './bids.service';
import { LoggingService } from '../common/services/logging.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuctionController],
  providers: [AuctionService, BidsService, LoggingService],
  exports: [AuctionService, BidsService],
})
export class AuctionModule {}