import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum } from 'class-validator';

export enum AuctionFilter {
  ALL = 'ALL',
  OWN = 'OWN',
  BID = 'BID',
  WON = 'WON',
}

export class AuctionQueryDto {
  @ApiProperty({
    description:
      'Filter auctions: ALL (all auctions), OWN (your created auctions), BID (auctions you bid on), WON (auctions you won)',
    enum: AuctionFilter,
    example: AuctionFilter.ALL,
  })
  @IsEnum(AuctionFilter)
  filter: AuctionFilter;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 500,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
