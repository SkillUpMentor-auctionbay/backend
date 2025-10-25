import { ApiProperty } from '@nestjs/swagger';

export class AuctionCardDto {
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
    description: 'The name of the seller',
    example: 'John Doe',
    type: String,
  })
  sellerName: string;
}