import {
  Controller,
  Get,
  Post,
  Patch,
  Request,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoggingService } from '../common/services/logging.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { DetailedAuctionDto } from './dto/detailed-auction.dto';
import { AuctionListResponseDto } from './dto/auction-list-response.dto';

@ApiTags('auctions')
@Controller({ path: 'auctions', version: '1' })
export class AuctionController {
  constructor(
    private auctionService: AuctionService,
    private loggingService: LoggingService,
  ) {}


  @Post('me/auctions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 201,
    description: 'Auction created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Auction created successfully' },
        auction: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or invalid end time',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async createAuction(@Request() req, @Body() createAuctionDto: CreateAuctionDto) {
    this.loggingService.logInfo('Create auction request', {
      userId: req.user.id,
      title: createAuctionDto.title,
    });

    try {
      const auction = await this.auctionService.createAuction(
        req.user.id,
        createAuctionDto
      );

      return {
        message: 'Auction created successfully',
        auction,
      };
    } catch (error) {
      this.loggingService.logError('Create auction failed', error, {
        userId: req.user.id,
        title: createAuctionDto.title,
      });
      throw error;
    }
  }


  @Patch('me/auctions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Auction updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Auction updated successfully' },
        auction: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Auction has bids or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only update your own auctions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  async updateAuction(
    @Request() req,
    @Param('id') auctionId: string,
    @Body() updateAuctionDto: UpdateAuctionDto
  ) {
    this.loggingService.logInfo('Update auction request', {
      userId: req.user.id,
      auctionId,
      updates: updateAuctionDto,
    });

    try {
      const auction = await this.auctionService.updateAuction(
        auctionId,
        req.user.id,
        updateAuctionDto
      );

      return {
        message: 'Auction updated successfully',
        auction,
      };
    } catch (error) {
      this.loggingService.logError('Update auction failed', error, {
        userId: req.user.id,
        auctionId,
      });
      throw error;
    }
  }


  @Get()
  @ApiResponse({
    status: 200,
    description: 'Active auctions retrieved successfully',
    type: AuctionListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    example: 10,
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term for title and description',
    required: false,
    example: 'camera',
    type: String,
  })
  @ApiQuery({
    name: 'minPrice',
    description: 'Minimum price filter',
    required: false,
    example: 100,
    type: Number,
  })
  @ApiQuery({
    name: 'maxPrice',
    description: 'Maximum price filter',
    required: false,
    example: 1000,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Field to sort by',
    required: false,
    example: 'endTime',
    type: String,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order (asc or desc)',
    required: false,
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  async getActiveAuctions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy: string = 'endTime',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<AuctionListResponseDto> {
    const userId = req.user?.id;

    this.loggingService.logInfo('Get active auctions request', {
      userId,
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    });

    try {
      return await this.auctionService.getActiveAuctions(
        page,
        limit,
        userId,
        search,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      );
    } catch (error) {
      this.loggingService.logError('Get active auctions failed', error, {
        userId,
        page,
        limit,
      });
      throw error;
    }
  }


  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Auction details retrieved successfully',
    type: DetailedAuctionDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  async getAuctionById(
    @Request() req,
    @Param('id') auctionId: string
  ): Promise<DetailedAuctionDto> {
    const userId = req.user?.id;

    this.loggingService.logInfo('Get auction details request', {
      userId,
      auctionId,
    });

    try {
      return await this.auctionService.getAuctionById(auctionId, userId);
    } catch (error) {
      this.loggingService.logError('Get auction details failed', error, {
        userId,
        auctionId,
      });
      throw error;
    }
  }


  @Get('me/auctions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User auctions retrieved successfully',
    type: AuctionListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    example: 10,
    type: Number,
  })
  @ApiQuery({
    name: 'includeEnded',
    description: 'Include ended auctions in results',
    required: false,
    example: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getUserAuctions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('includeEnded') includeEnded: boolean = false
  ): Promise<AuctionListResponseDto> {
    this.loggingService.logInfo('Get user auctions request', {
      userId: req.user.id,
      page,
      limit,
      includeEnded,
    });

    try {
      return await this.auctionService.getUserAuctions(
        req.user.id,
        page,
        limit,
        includeEnded
      );
    } catch (error) {
      this.loggingService.logError('Get user auctions failed', error, {
        userId: req.user.id,
        page,
        limit,
      });
      throw error;
    }
  }


  @Get('me/bids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User bidded auctions retrieved successfully',
    type: AuctionListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getUserBiddedAuctions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<AuctionListResponseDto> {
    this.loggingService.logInfo('Get user bidded auctions request', {
      userId: req.user.id,
      page,
      limit,
    });

    try {
      return await this.auctionService.getUserBiddedAuctions(
        req.user.id,
        page,
        limit
      );
    } catch (error) {
      this.loggingService.logError('Get user bidded auctions failed', error, {
        userId: req.user.id,
        page,
        limit,
      });
      throw error;
    }
  }


  @Get('me/won-auctions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User won auctions retrieved successfully',
    type: AuctionListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getUserWonAuctions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<AuctionListResponseDto> {
    this.loggingService.logInfo('Get user won auctions request', {
      userId: req.user.id,
      page,
      limit,
    });

    try {
      return await this.auctionService.getUserWonAuctions(
        req.user.id,
        page,
        limit
      );
    } catch (error) {
      this.loggingService.logError('Get user won auctions failed', error, {
        userId: req.user.id,
        page,
        limit,
      });
      throw error;
    }
  }


  @Post(':id/bid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Bid placed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Bid placed successfully' },
        bid: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Auction ended or invalid bid amount',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You cannot bid on your own auction',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  async placeBid(
    @Request() req,
    @Param('id') auctionId: string,
    @Body() placeBidDto: PlaceBidDto
  ) {
    this.loggingService.logInfo('Place bid request', {
      userId: req.user.id,
      auctionId,
      amount: placeBidDto.amount,
    });

    try {
      const bid = await this.auctionService.placeBid(
        auctionId,
        req.user.id,
        placeBidDto
      );

      return {
        message: 'Bid placed successfully',
        bid,
      };
    } catch (error) {
      this.loggingService.logError('Place bid failed', error, {
        userId: req.user.id,
        auctionId,
        amount: placeBidDto.amount,
      });
      throw error;
    }
  }
}