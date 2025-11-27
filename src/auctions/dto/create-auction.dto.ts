import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuctionDto {
  @ApiProperty({
    description: 'The title of the auction',
    example: 'Vintage Camera Collection',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The description of the auction',
    example:
      'A collection of vintage cameras from the 1970s in excellent condition',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'The starting price of the auction',
    example: 100,
    type: Number,
  })
  @IsNotEmpty()
  @Type(() => Number)
  startingPrice: number;

  @ApiProperty({
    description:
      'The end date and time of the auction (always ends at midnight UTC)',
    example: '2024-12-31T00:00:00.000Z',
    type: Date,
  })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({
    description: 'Optional image URL for the auction',
    example: 'https://example.com/images/vintage-camera.jpg',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
