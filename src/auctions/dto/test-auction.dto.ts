import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsDateString, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for setting auction end time for testing purposes
 */
export class TestSetAuctionTimeDto {
  @ApiProperty({
    description: 'New end time for the auction (ISO format)',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsDateString()
  endTime: string;

  
  @ApiPropertyOptional({
    description: 'Whether to bypass end time validation (allow past dates)',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  bypassValidation?: boolean;
}

/**
 * DTO for resetting auction to specific state for testing
 */
export class TestResetAuctionDto {
  @ApiProperty({
    description: 'New current bid/current price',
    example: 150.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  currentPrice: number;

  @ApiPropertyOptional({
    description: 'New end time (optional - will keep current if not specified)',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Auction status',
    enum: ['ACTIVE', 'ENDED', 'CANCELLED'],
    example: 'ACTIVE'
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'ENDED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Number of minutes from now to set end time',
    example: 60,
    minimum: -999999,
    maximum: 999999
  })
  @IsOptional()
  @IsNumber()
  @Min(-999999)
  @Max(999999)
  minutesFromNow?: number;

  @ApiPropertyOptional({
    description: 'Number of hours from now to set end time',
    example: 2,
    minimum: -999999,
    maximum: 999999
  })
  @IsOptional()
  @IsNumber()
  @Min(-999999)
  @Max(999999)
  hoursFromNow?: number;

  @ApiPropertyOptional({
    description: 'Number of days from now to set end time',
    example: 1,
    minimum: -999999,
    maximum: 999999
  })
  @IsOptional()
  @IsNumber()
  @Min(-999999)
  @Max(999999)
  daysFromNow?: number;

  @ApiPropertyOptional({
    description: 'Whether to clear all bids for this auction',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  clearBids?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to bypass validation checks',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  bypassValidation?: boolean;
}

/**
 * DTO for batch auction testing operations
 */
export class TestBatchAuctionOperationDto {
  @ApiProperty({
    description: 'Array of auction IDs to modify',
    example: ['auction1', 'auction2', 'auction3'],
    type: [String]
  })
  @IsString({ each: true })
  auctionIds: string[];

  @ApiPropertyOptional({
    description: 'Minutes to add to all auction end times',
    example: 30
  })
  @IsOptional()
  @IsNumber()
  minutesOffset?: number;

  @ApiPropertyOptional({
    description: 'Hours to add to all auction end times',
    example: 2
  })
  @IsOptional()
  @IsNumber()
  hoursOffset?: number;

  @ApiPropertyOptional({
    description: 'Days to add to all auction end times',
    example: 1
  })
  @IsOptional()
  @IsNumber()
  daysOffset?: number;

  @ApiPropertyOptional({
    description: 'Set all auctions to this status',
    enum: ['ACTIVE', 'ENDED', 'CANCELLED']
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'ENDED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Multiplier for current prices',
    example: 1.5,
    minimum: 0,
    maximum: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  priceMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Whether to bypass validation for all operations',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  bypassValidation?: boolean;
}

/**
 * DTO for simulating bidding activity
 */
export class TestSimulateBiddingDto {
  @ApiProperty({
    description: 'Auction ID to simulate bidding on',
    example: 'auction123'
  })
  @IsString()
  auctionId: string;

  @ApiPropertyOptional({
    description: 'Number of bids to simulate',
    example: 5,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  numberOfBids?: number;

  @ApiPropertyOptional({
    description: 'Starting bid amount',
    example: 100.00,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  startAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum bid amount',
    example: 500.00,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Time interval between bids (seconds)',
    example: 2,
    minimum: 0.1,
    maximum: 60
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(60)
  bidInterval?: number;

  @ApiPropertyOptional({
    description: 'User IDs to simulate bidding from (will use current user if not specified)',
    example: ['user1', 'user2'],
    type: [String]
  })
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether to create bids in sequence (true) or randomly (false)',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  sequential?: boolean;
}