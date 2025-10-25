import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { SignupDto, SignupResponseDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials (email + password)',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  @ApiBody({
    type: SignupDto,
    description:
      'User registration data (name, surname, email, password, optional profile picture)',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: SignupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or user already exists',
  })
  async signUp(@Body() signUpDto: SignupDto): Promise<SignupResponseDto> {
    return this.authService.signUp(signUpDto);
  }
}
