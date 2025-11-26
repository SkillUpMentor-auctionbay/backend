import { ApiProperty } from '@nestjs/swagger';

export class UserStatisticsDto {
  @ApiProperty({
    description: 'Total earnings from all completed auctions (in EUR)',
    example: 1245.5,
    type: 'number',
    format: 'float',
  })
  totalEarnings: number;

  
  @ApiProperty({
    description: 'Total number of auctions created by the user',
    example: 23,
    type: 'number',
  })
  totalPostedAuctions: number;

  @ApiProperty({
    description: 'Number of auctions where user currently has active bids',
    example: 5,
    type: 'number',
  })
  currentlyBidding: number;

  @ApiProperty({
    description: 'Number of auctions where user is currently the highest bidder',
    example: 2,
    type: 'number',
  })
  currentlyWinning: number;
}