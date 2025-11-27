import { ApiProperty } from '@nestjs/swagger';

export class BidderDto {
  @ApiProperty({
    description: 'The unique identifier of the bidder',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the bidder',
    example: 'Jane',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The surname of the bidder',
    example: 'Smith',
    type: String,
  })
  surname: string;

  @ApiProperty({
    description: 'The profile picture URL of the bidder (optional)',
    example: 'https://example.com/profile-pictures/jane.jpg',
    type: String,
    required: false,
  })
  profilePictureUrl?: string;
}

export class BidDto {
  @ApiProperty({
    description: 'The unique identifier of the bid',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The bid amount',
    example: 125.5,
    type: Number,
  })
  amount: number;

  @ApiProperty({
    description: 'The timestamp when the bid was placed',
    example: '2024-01-15T14:30:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The bidder information',
    type: BidderDto,
  })
  bidder: BidderDto;
}
