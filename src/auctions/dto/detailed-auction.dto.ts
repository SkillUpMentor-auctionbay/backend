import { ApiProperty } from '@nestjs/swagger';
import { BidDto } from './bid.dto';

export class SellerDto {
  @ApiProperty({
    description: 'The unique identifier of the seller',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the seller',
    example: 'John',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The surname of the seller',
    example: 'Doe',
    type: String,
  })
  surname: string;

  @ApiProperty({
    description: 'The profile picture URL of the seller (optional)',
    example: 'https://example.com/profile-pictures/john.jpg',
    type: String,
    required: false,
  })
  profilePictureUrl?: string;
}

export class DetailedAuctionDto {
  @ApiProperty({
    description: 'The unique identifier of the auction',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The title of the auction',
    example: 'Vintage Camera Collection',
    type: String,
  })
  title: string;

  @ApiProperty({
    description: 'The description of the auction',
    example: 'A collection of vintage cameras from the 1970s in excellent condition',
    type: String,
  })
  description: string;

  @ApiProperty({
    description: 'Optional image URL for the auction',
    example: 'https://example.com/images/vintage-camera.jpg',
    type: String,
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'The starting price of the auction',
    example: 100.00,
    type: Number,
  })
  startingPrice: number;

  @ApiProperty({
    description: 'The current price of the auction (highest bid or starting price)',
    example: 150.00,
    type: Number,
  })
  currentPrice: number;

  @ApiProperty({
    description: 'The end date and time of the auction',
    example: '2024-12-31T23:59:59.000Z',
    type: Date,
  })
  endTime: Date;

  @ApiProperty({
    description: 'The status of the auction from the current user perspective',
    example: 'WINNING',
    enum: ['IN_PROGRESS', 'WINNING', 'OUTBID', 'DONE'],
    type: String,
  })
  status: 'IN_PROGRESS' | 'WINNING' | 'OUTBID' | 'DONE';

  @ApiProperty({
    description: 'The current user bid amount (only if user has bid)',
    example: 125.00,
    type: Number,
    required: false,
  })
  myBid?: number;

  @ApiProperty({
    description: 'The total number of bids placed on this auction',
    example: 5,
    type: Number,
  })
  bidCount: number;

  @ApiProperty({
    description: 'The seller information',
    type: SellerDto,
  })
  seller: SellerDto;

  @ApiProperty({
    description: 'The timestamp when the auction was created',
    example: '2024-01-01T12:00:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'List of all bids placed on this auction, ordered by amount (highest first)',
    type: [BidDto],
  })
  bids: BidDto[];
}