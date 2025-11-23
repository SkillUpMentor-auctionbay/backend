import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'The ID of the user to receive the notification',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'The ID of the auction related to this notification',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  auctionId: string;

  @ApiProperty({
    description: 'The price of the notification - null for outbid, number for won notifications',
    example: 150,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;
}