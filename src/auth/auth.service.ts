import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoggingService } from '../common/services/logging.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private loggingService: LoggingService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return {
        ...result,
        profilePictureUrl: result.profile_picture_url,
        profile_picture_url: undefined,
      };
    }
    return null;
  }

  async login(loginDto: { email: string; password: string }) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      this.loggingService.logLoginAttempt(loginDto.email, false, {
        username: loginDto.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    this.loggingService.logLoginAttempt(loginDto.email, true, {
      userId: user.id,
    });

    this.loggingService.logTokenGeneration(user.email, user.id);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        profilePictureUrl: user.profilePictureUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async signUp(signupDto: {
    name: string;
    surname: string;
    email: string;
    password: string;
    profilePictureUrl?: string;
  }) {
    this.loggingService.logInfo('Starting user registration', {
      username: signupDto.email,
    });

    const existingUser = await this.usersService.findByEmail(signupDto.email);

    if (existingUser) {
      this.loggingService.logWarning(
        'Registration failed - email already exists',
        {
          username: signupDto.email,
        },
      );
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    try {
      const user = await this.usersService.createUser(
        signupDto.name,
        signupDto.surname,
        signupDto.email,
        hashedPassword,
        signupDto.profilePictureUrl,
      );

      const payload = { email: user.email, sub: user.id };
      const access_token = this.jwtService.sign(payload);

      this.loggingService.logUserRegistration(user.email, user.id);
      this.loggingService.logTokenGeneration(user.email, user.id);

      return {
        access_token,
        user,
      };
    } catch (error) {
      this.loggingService.logError('Failed to create user', error, {
        username: signupDto.email,
      });
      throw error;
    }
  }
}
