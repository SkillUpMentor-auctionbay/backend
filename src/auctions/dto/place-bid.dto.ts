import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceBidDto {
  @ApiProperty({
    description: 'The bid amount',
    example: 125.50,
    type: Number,
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;
}