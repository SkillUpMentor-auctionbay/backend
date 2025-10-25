import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseDto } from './auth-response.dto';

export class SignupDto {
  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
    type: String,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name cannot be longer than 50 characters' })
  name: string;

  @ApiProperty({
    description: 'The surname of the user',
    example: 'Doe',
    type: String,
  })
  @IsString({ message: 'Surname must be a string' })
  @IsNotEmpty({ message: 'Surname is required' })
  @MinLength(2, { message: 'Surname must be at least 2 characters long' })
  @MaxLength(50, { message: 'Surname cannot be longer than 50 characters' })
  surname: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'The password of the user (min 6 characters)',
    example: 'password123',
    type: String,
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'The profile picture URL of the user (optional)',
    example: 'https://example.com/profile-pictures/john.jpg',
    type: String,
    required: false,
  })
  @IsString({ message: 'Profile picture URL must be a string' })
  @IsOptional()
  profilePictureUrl?: string;
}

export class SignupResponseDto extends AuthResponseDto {}
