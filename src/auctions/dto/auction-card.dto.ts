import { ApiProperty } from '@nestjs/swagger';
import { AuctionStatus } from '../utils/auction-status.util';

export class AuctionCardDto {
  @ApiProperty({
    description: 'The unique identifier of auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The title of auction',
    example: 'Vintage Camera Collection',
    type: String,
  })
  title: string;

  @ApiProperty({
    description: 'The starting price of auction',
    example: 100.00,
    type: Number,
  })
  startingPrice: number;

  @ApiProperty({
    description: 'The current price of auction (highest bid or starting price)',
    example: 150.00,
    type: Number,
  })
  currentPrice: number;

  @ApiProperty({
    description: 'The optional image URL of the auction',
    example: '/static/auction-images/auction_123456.jpg',
    type: String,
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'The end date and time of auction',
    example: '2024-12-31T23:59:59.000Z',
    type: Date,
  })
  endTime: Date;

  @ApiProperty({
    description: 'The status of the auction from the current user\'s perspective',
    enum: AuctionStatus,
    example: 'WINNING',
  })
  status: AuctionStatus;

  @ApiProperty({
    description: 'The ID of the seller who created this auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  sellerId: string;
}