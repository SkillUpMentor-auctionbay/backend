import { ApiProperty } from '@nestjs/swagger';
import { AuctionCardDto } from './auction-card.dto';

export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 100,
    type: Number,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of auctions',
    example: 250,
    type: Number,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
    type: Number,
  })
  totalPages: number;
}

export class AuctionListResponseDto {
  @ApiProperty({
    description: 'List of auction cards',
    type: [AuctionCardDto],
  })
  auctions: AuctionCardDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
