import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Request,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuctionService } from './auction.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoggingService } from '../common/services/logging.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { DetailedAuctionDto } from './dto/detailed-auction.dto';
import { AuctionListResponseDto } from './dto/auction-list-response.dto';
import { AuctionQueryDto, AuctionFilter } from './dto/auction-query.dto';
import { ImageUploadResponseDto, ImageUploadDto } from './dto/image-upload.dto';
import { FileUploadErrorDto } from '../users/dto/change-profile-picture.dto';

@ApiTags('auctions')
@Controller({ path: 'auctions', version: '1' })
export class AuctionController {
  constructor(
    private readonly auctionService: AuctionService,
    private readonly loggingService: LoggingService,
    private readonly fileUploadService: FileUploadService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('me/auction')
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
  async createAuction(
    @Request() req,
    @Body() createAuctionDto: CreateAuctionDto,
  ) {
    this.loggingService.logInfo('Create auction request', {
      userId: req.user.id,
      title: createAuctionDto.title,
    });

    try {
      const auction = await this.auctionService.createAuction(
        req.user.id,
        createAuctionDto,
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

  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload for the auction',
    type: ImageUploadDto,
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of auction to upload image for',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Auction image uploaded successfully',
    type: ImageUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file or filename',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only upload images to your own auctions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - File validation failed',
    type: FileUploadErrorDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file or filename',
    type: FileUploadErrorDto,
  })
  async uploadAuctionImage(
    @Request() req,
    @Param('id') auctionId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpeg|jpg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    this.loggingService.logInfo('Auction image upload request', {
      userId: req.user.id,
      auctionId,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype,
    });

    if (!file) {
      this.loggingService.logWarning(
        'Auction image upload attempted without file',
        {
          userId: req.user.id,
          auctionId,
        },
      );
      throw new BadRequestException('File is required for image upload');
    }

    if (!file.originalname || typeof file.originalname !== 'string') {
      this.loggingService.logWarning(
        'Auction image upload with invalid filename',
        {
          userId: req.user.id,
          auctionId,
          fileName: file.originalname,
        },
      );
      throw new BadRequestException('Invalid filename provided');
    }

    try {
      await this.auctionService.validateAuctionOwnership(
        auctionId,
        req.user.id,
      );

      const imageUrl = await this.fileUploadService.saveAuctionImage(file);

      await this.prisma.auction.update({
        where: { id: auctionId },
        data: { imageUrl },
      });

      return {
        message: 'Image uploaded successfully',
        imageUrl,
      };
    } catch (error) {
      this.loggingService.logError('Auction image upload failed', error, {
        userId: req.user.id,
        auctionId,
        fileName: file?.originalname,
        fileSize: file?.size,
      });
      throw error;
    }
  }

  @Delete(':id/delete-image')
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
    description: 'Auction image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - You can only delete images from your own auctions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  async deleteAuctionImage(@Request() req, @Param('id') auctionId: string) {
    this.loggingService.logInfo('Delete auction image request', {
      userId: req.user.id,
      auctionId,
    });

    try {
      await this.auctionService.deleteAuctionImage(auctionId, req.user.id);

      return {
        message: 'Image deleted successfully',
      };
    } catch (error) {
      this.loggingService.logError('Delete auction image failed', error, {
        userId: req.user.id,
        auctionId,
      });
      throw error;
    }
  }

  @Patch('me/auction/:id')
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
    @Body() updateAuctionDto: UpdateAuctionDto,
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
        updateAuctionDto,
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

  @Delete('me/auction/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the auction to delete',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Auction deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only delete your own auctions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  async deleteAuction(@Request() req, @Param('id') auctionId: string) {
    this.loggingService.logInfo('Delete auction request', {
      userId: req.user.id,
      auctionId,
    });

    try {
      await this.auctionService.deleteAuction(auctionId, req.user.id);
    } catch (error) {
      this.loggingService.logError('Delete auction failed', error, {
        userId: req.user.id,
        auctionId,
      });
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Auctions retrieved successfully',
    type: AuctionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  @ApiQuery({
    name: 'filter',
    description:
      'Filter auctions: OWN (your created auctions), BID (auctions you bid on), WON (auctions you won)',
    required: false,
    enum: AuctionFilter,
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
  async getAuctions(
    @Request() req,
    @Query() queryDto: AuctionQueryDto,
  ): Promise<AuctionListResponseDto> {
    const userId = req.user?.id;

    this.loggingService.logInfo('Get auctions request', {
      userId,
      page: queryDto.page,
      limit: queryDto.limit,
    } as any);

    try {
      return await this.auctionService.getAuctions(queryDto, userId);
    } catch (error) {
      this.loggingService.logError('Get auctions failed', error, {
        userId,
        page: queryDto.page,
        limit: queryDto.limit,
      } as any);
      throw error;
    }
  }

  @Get(':id')
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
    description: 'Auction details retrieved successfully',
    type: DetailedAuctionDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Auction not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getAuctionById(
    @Request() req,
    @Param('id') auctionId: string,
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
    @Body() placeBidDto: PlaceBidDto,
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
        placeBidDto,
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
