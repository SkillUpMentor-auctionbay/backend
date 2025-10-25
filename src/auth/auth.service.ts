import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../common/services/logging.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private loggingService: LoggingService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: { username: string; password: string }) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      this.loggingService.logLoginAttempt(loginDto.username, false, {
        username: loginDto.username,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    this.loggingService.logLoginAttempt(loginDto.username, true, {
      userId: user.id,
    });

    this.loggingService.logTokenGeneration(user.username, user.id);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async signUp(signupDto: { username: string; password: string }) {
    this.loggingService.logInfo('Starting user registration', {
      username: signupDto.username,
    });

    const existingUser = await this.prisma.user.findUnique({
      where: { username: signupDto.username },
    });

    if (existingUser) {
      this.loggingService.logWarning(
        'Registration failed - username already exists',
        {
          username: signupDto.username,
        },
      );
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          username: signupDto.username,
          password: hashedPassword,
        },
      });

      const payload = { username: user.username, sub: user.id };
      const access_token = this.jwtService.sign(payload);

      this.loggingService.logUserRegistration(user.username, user.id);
      this.loggingService.logTokenGeneration(user.username, user.id);

      return {
        access_token,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      this.loggingService.logError('Failed to create user', error, {
        username: signupDto.username,
      });
      throw error;
    }
  }
}