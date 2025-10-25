import { ApiProperty } from '@nestjs/swagger';
import { AuctionCardDto } from './auction-card.dto';

export class AuctionListResponseDto {
  @ApiProperty({
    description: 'List of auction cards',
    type: [AuctionCardDto],
  })
  auctions: AuctionCardDto[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of auctions',
    example: 25,
    type: Number,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
    type: Number,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
    type: Boolean,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
    type: Boolean,
  })
  hasPrevious: boolean;
}