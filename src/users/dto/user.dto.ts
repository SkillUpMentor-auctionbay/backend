import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The surname of the user',
    example: 'Doe',
    type: String,
  })
  surname: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'The profile picture URL of the user (optional)',
    example: 'https://example.com/profile-pictures/john.jpg',
    type: String,
    required: false,
  })
  profilePictureUrl?: string;

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
