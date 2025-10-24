import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The username of the user',
    example: 'johndoe',
    type: String,
  })
  username: string;

  @ApiProperty({
    description: 'The timestamp when the user was created',
    example: '2023-12-01T12:00:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the user was last updated',
    example: '2023-12-01T12:00:00.000Z',
    type: Date,
  })
  updatedAt: Date;
}