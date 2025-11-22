import { Controller, Post, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuctionEndService } from './auction-end.service';
import { LoggingService } from '../common/services/logging.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('auctions-end')
@Controller({ path: 'auctions', version: '1' })
export class AuctionEndController {
  constructor(
    private auctionEndService: AuctionEndService,
    private loggingService: LoggingService,
  ) {}

  @Post('process-ended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Ended auctions processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async processEndedAuctions() {
    this.loggingService.logInfo('Manual trigger: Processing ended auctions');

    try {
      await this.auctionEndService.processEndedAuctionsManually();

      return {
        statusCode: HttpStatus.OK,
        message: 'Ended auctions processed successfully',
      };
    } catch (error) {
      this.loggingService.logError('Failed to process ended auctions (manual trigger)', error as Error);
      throw error;
    }
  }
}