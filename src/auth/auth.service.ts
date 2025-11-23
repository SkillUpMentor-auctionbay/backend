import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoggingService } from '../common/services/logging.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loggingService: LoggingService,
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

    const payload = {
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

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
        tokenVersion: user.tokenVersion,
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

      const payload = {
        email: user.email,
        sub: user.id,
        tokenVersion: user.tokenVersion
      };
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

  async logout(userId: string) {
    this.loggingService.logInfo('User logging out', {
      userId,
    });

    try {
      await this.usersService.incrementTokenVersion(userId);

      this.loggingService.logInfo('User logged out successfully', {
        userId,
      });

      return { message: 'Logged out successfully' };
    } catch (error) {
      this.loggingService.logError('Failed to logout user', error, {
        userId,
      });
      throw error;
    }
  }

  async forgotPassword(email: string) {
    this.loggingService.logInfo('Password reset request received', { email });

    const result = await this.usersService.setPasswordResetToken(email);

    if (!result) {
      this.loggingService.logInfo('Password reset requested for non-existent email', { email });
      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    }

    try {

      this.loggingService.logInfo('Password reset email sent successfully', { email });

      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    } catch (error) {
      this.loggingService.logError('Failed to send password reset email', error, { email });

      await this.usersService.clearPasswordResetTokenByEmail(email);

      throw new BadRequestException('Failed to send password reset email. Please try again later.');
    }
  }

  async resetPassword(token: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    try {
      const updatedUser = await this.usersService.resetPassword(token, password);

      this.loggingService.logInfo('Password reset completed successfully', {
        userId: updatedUser.id,
        email: updatedUser.email,
      });

      return {
        message: 'Password reset successfully. Please login with your new password.',
        user: updatedUser,
      };
    } catch (error) {
      this.loggingService.logError('Password reset failed', error, { token });
      throw error;
    }
  }

  async verifyResetToken(token: string) {
    try {
      const user = await this.usersService.findByResetToken(token);

      if (!user) {
        return { valid: false, message: 'Invalid or expired reset token' };
      }

      return {
        valid: true,
        message: 'Reset token is valid',
        email: user.email
      };
    } catch (error) {
      this.loggingService.logError('Token verification failed', error, { token });
      return { valid: false, message: 'Token verification failed' };
    }
  }
}
