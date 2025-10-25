import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseDto } from './auth-response.dto';

export class LoginDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
    type: String,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class LoginResponseDto extends AuthResponseDto {}
