import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceBidDto {
  @ApiProperty({
    description: 'The bid amount (must be higher than current price)',
    example: 125.50,
    type: Number,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}