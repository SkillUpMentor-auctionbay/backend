import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';


export class UpdateAuctionDto {
  @ApiProperty({
    description: 'The title of the auction',
    example: 'Updated Vintage Camera Collection',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'The description of the auction',
    example: 'Updated description: A collection of vintage cameras from the 1970s',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The end date and time of the auction',
    example: '2024-12-31T23:59:59.000Z',
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiProperty({
    description: 'Optional image URL for the auction',
    example: 'https://example.com/images/updated-camera.jpg',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}