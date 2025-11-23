import { ApiProperty } from '@nestjs/swagger';

export class NotificationAuctionDto {
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
    description: 'The image URL of the auction',
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
}

export class NotificationDto {
  @ApiProperty({
    description: 'The unique identifier of notification',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The price of the notification - null for outbid, number for won notifications',
    example: 150,
    type: Number,
    required: false,
    nullable: true,
  })
  price?: number;

  @ApiProperty({
    description: 'When the notification was created',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The auction information related to this notification',
    type: NotificationAuctionDto,
  })
  auction: NotificationAuctionDto;
}